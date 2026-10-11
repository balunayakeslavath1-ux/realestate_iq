import datetime
from typing import List, Optional, Tuple, Dict, Any
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.models import Property, MarketSnapshot, DemandSignal, Locality

def calculate_property_metrics(properties: List[Property]) -> Dict[str, Any]:
    """
    Computes summary metrics for a given set of properties.
    Ensures sale and rent are never mixed (caller must pass filtered properties).
    """
    if not properties:
        return {
            "active_listings": 0,
            "average_asking_price": 0.0,
            "median_asking_price": 0.0,
            "median_price_per_sqft": 0.0,
            "new_listings_30d": 0,
            "sample_size": 0
        }

    prices = [p.price for p in properties if p.price is not None and p.price > 0]
    areas = [p.area_sqft for p in properties if p.area_sqft is not None and p.area_sqft > 0]
    
    # Calculate price per sqft for valid pairs
    pp_sqft = [
        p.price / p.area_sqft
        for p in properties
        if p.price is not None and p.price > 0 and p.area_sqft is not None and p.area_sqft > 0
    ]

    # New listings in last 30 days
    cutoff_date = datetime.date.today() - datetime.timedelta(days=30)
    new_count = sum(1 for p in properties if p.listing_date and p.listing_date >= cutoff_date)

    avg_price = float(np.mean(prices)) if prices else 0.0
    med_price = float(np.median(prices)) if prices else 0.0
    med_sqft = float(np.median(pp_sqft)) if pp_sqft else 0.0

    return {
        "active_listings": len(properties),
        "average_asking_price": round(avg_price, 2),
        "median_asking_price": round(med_price, 2),
        "median_price_per_sqft": round(med_sqft, 2),
        "new_listings_30d": new_count,
        "sample_size": len(properties)
    }

def calculate_safe_percentage_change(current: float, baseline: Optional[float]) -> Optional[float]:
    """
    Computes percentage change safely without dividing by zero or negative baselines.
    """
    if baseline is None or baseline <= 0 or current is None:
        return None
    pct = ((current - baseline) / baseline) * 100.0
    return round(float(pct), 2)

def calculate_supply_distribution(properties: List[Property], listing_type: str) -> Dict[str, Any]:
    """
    Computes property type distribution and price brackets.
    """
    total = len(properties)
    if total == 0:
        return {
            "by_property_type": [],
            "by_price_range": []
        }

    # Type breakdown
    type_counts: Dict[str, int] = {}
    for p in properties:
        t = p.property_type.lower()
        type_counts[t] = type_counts.get(t, 0) + 1

    type_dist = [
        {
            "property_type": p_type.capitalize(),
            "count": count,
            "percentage": round((count / total) * 100.0, 1)
        }
        for p_type, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    # Price brackets (tailored for Sale vs Rent)
    if listing_type.lower() == "sale":
        brackets = [
            ("Under ₹50 L", lambda p: p < 5_000_000),
            ("₹50 L - ₹1 Cr", lambda p: 5_000_000 <= p < 10_000_000),
            ("₹1 Cr - ₹2 Cr", lambda p: 10_000_000 <= p < 20_000_000),
            ("Above ₹2 Cr", lambda p: p >= 20_000_000),
        ]
    else: # rent
        brackets = [
            ("Under ₹15,000", lambda p: p < 15_000),
            ("₹15,000 - ₹30,000", lambda p: 15_000 <= p < 30_000),
            ("₹30,000 - ₹50,000", lambda p: 30_000 <= p < 50_000),
            ("Above ₹50,000", lambda p: p >= 50_000),
        ]

    price_dist = []
    for label, fn in brackets:
        cnt = sum(1 for p in properties if fn(p.price))
        price_dist.append({
            "price_range": label,
            "count": cnt,
            "percentage": round((cnt / total) * 100.0, 1)
        })

    return {
        "by_property_type": type_dist,
        "by_price_range": price_dist
    }

def evaluate_demand_score(signals: List[DemandSignal]) -> Dict[str, Any]:
    """
    Evaluates demand activity strictly from available signals.
    Requirement:
    - Display an activity score from 0 to 100 only when sufficient, relevant data is available.
    - If genuine demand data is unavailable, display 'Insufficient demand data' rather than inventing a score.
    - Do not represent sample demand signals as actual buyer demand.
    - Explain contributing signals and methodology transparently.
    """
    MINIMUM_SIGNALS_REQUIRED = 1
    MINIMUM_SAMPLE_SIZE = 15

    total_sample = sum(s.sample_size for s in signals)

    if not signals or total_sample < MINIMUM_SAMPLE_SIZE:
        return {
            "has_sufficient_data": False,
            "demand_score": None,
            "score_classification": None,
            "contributing_signals": [],
            "methodology_explanation": (
                "Demand scores require recorded demand signals and an aggregated sample size "
                "of at least 15 interactions. No scores are fabricated without empirical data."
            ),
            "total_sample_size": total_sample,
            "data_period": "Past 6 Months",
            "status_message": "Insufficient demand data"
        }

    # Sort signals by date descending to pick latest/relevant
    sorted_signals = sorted(signals, key=lambda s: s.observation_date, reverse=True)
    latest_date = sorted_signals[0].observation_date
    recent_signals = [s for s in sorted_signals if s.observation_date == latest_date]
    if not recent_signals:
        recent_signals = sorted_signals[:3]

    weights = {
        "buyer_inquiries": 0.45,
        "search_engagement": 0.30,
        "registration_activity": 0.25,
        "demo_listing_engagement_index": 1.0
    }

    contributing = []
    weighted_sum = 0.0
    weight_total = 0.0

    is_demo_index = False
    for s in recent_signals:
        s_type = s.signal_type.lower()
        if "demo" in s_type or "engagement_index" in s_type:
            is_demo_index = True
        w = weights.get(s_type, 0.33)
        norm_val = min(max(s.signal_value, 0.0), 100.0)
        weighted_sum += norm_val * w
        weight_total += w
        contributing.append({
            "signal_type": s.signal_type.replace("_", " ").title(),
            "raw_value": round(s.signal_value, 1),
            "weight": round(w, 2),
            "normalized_score": round(norm_val, 1),
            "sample_size": s.sample_size,
            "source": s.source
        })

    final_score = round(weighted_sum / weight_total, 1) if weight_total > 0 else None

    if is_demo_index:
        classification = f"Engagement Index (Demo: {final_score}/100)"
        methodology = (
            "Illustrative demo engagement index only. NOT actual buyer demand, verified inquiries, "
            "or registered transactions. Provided for testing platform UI and analytical workflows."
        )
        status_msg = "Demo engagement index (Simulated)"
    else:
        if final_score is not None:
            if final_score >= 75:
                classification = "High Activity"
            elif final_score >= 50:
                classification = "Moderate Activity"
            else:
                classification = "Low Activity"
        else:
            classification = "Moderate Activity"
        methodology = (
            "PropScope Demand Index combines verified buyer inquiries, portal search engagement, "
            "and government registration proxy activity. Scores reflect observed interaction intensity."
        )
        status_msg = "Demand signals recorded"

    return {
        "has_sufficient_data": True,
        "demand_score": final_score,
        "score_classification": classification,
        "contributing_signals": contributing,
        "methodology_explanation": methodology,
        "total_sample_size": sum(s.sample_size for s in recent_signals),
        "data_period": f"Latest Observation: {latest_date.strftime('%b %Y')}",
        "status_message": status_msg
    }
