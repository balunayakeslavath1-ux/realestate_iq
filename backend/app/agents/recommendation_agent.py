import datetime
from typing import Dict, Any, List, Optional

class RecommendationAgent:
    """
    Step 5 — Recommendation Agent
    Ranks localities according to the user's budget, expected appreciation,
    available supply and risk preferences using transparent Python rule scoring.
    """

    def __init__(self):
        pass

    def execute(
        self,
        localities: List[Dict[str, Any]],
        trend_results: Dict[str, Any],
        properties: List[Dict[str, Any]],
        budget_min: float = 6_000_000.0,    # Default ₹60 Lakhs
        budget_max: float = 20_000_000.0,   # Default ₹2.0 Crores
        risk_preference: str = "balanced",   # "conservative", "balanced", "aggressive"
        property_type: str = "all"
    ) -> Dict[str, Any]:
        start_time = datetime.datetime.now()

        forecasts = trend_results.get("forecasts", {})
        activity_scores = trend_results.get("activity_scores", {})

        # Compute locality profile stats
        loc_profiles = {}
        for loc in localities:
            loc_id = loc["id"]
            loc_name = loc["name"]

            # Filter active sale properties
            matched_props = [
                p for p in properties
                if p["locality_id"] == loc_id and p.get("listing_type") == "sale" and p.get("price", 0) > 0
            ]
            if property_type != "all":
                matched_props = [p for p in matched_props if property_type.lower() in p.get("property_type", "").lower()]

            prices = [p["price"] for p in matched_props]
            sqft_prices = [p["price_per_sqft"] for p in matched_props]

            med_price = float(sorted(prices)[len(prices)//2]) if prices else 10_000_000.0
            avg_sqft = float(sum(sqft_prices)/len(sqft_prices)) if sqft_prices else 8000.0

            forecast_info = forecasts.get(loc_name, {})
            appreciation_pct = forecast_info.get("projected_appreciation_pct", 8.5)
            activity_info = activity_scores.get(loc_name, {})
            activity_score = activity_info.get("score", 60.0)

            loc_profiles[loc_name] = {
                "locality_id": loc_id,
                "locality_name": loc_name,
                "latitude": loc["latitude"],
                "longitude": loc["longitude"],
                "active_inventory": len(matched_props),
                "median_price": med_price,
                "avg_price_per_sqft": round(avg_sqft, 2),
                "projected_appreciation": appreciation_pct,
                "activity_score": activity_score,
            }

        # Python Rules-Based Multi-Criteria Scoring
        # Weight configurations based on user risk preference
        risk_norm = risk_preference.lower()
        if risk_norm == "conservative":
            weights = {
                "budget_fit": 0.35,
                "supply_liquidity": 0.35,
                "stability": 0.20,
                "appreciation": 0.10,
            }
        elif risk_norm == "aggressive":
            weights = {
                "appreciation": 0.50,
                "budget_fit": 0.25,
                "growth_velocity": 0.15,
                "supply_liquidity": 0.10,
            }
        else: # balanced
            weights = {
                "appreciation": 0.35,
                "budget_fit": 0.30,
                "supply_liquidity": 0.20,
                "growth_velocity": 0.15,
            }

        ranked_list = []
        for loc_name, prof in loc_profiles.items():
            med_p = prof["median_price"]
            apprec = prof["projected_appreciation"]
            inv = prof["active_inventory"]
            act = prof["activity_score"]

            # 1. Budget Fit Score (0 to 100)
            if budget_min <= med_p <= budget_max:
                budget_score = 100.0
            elif med_p < budget_min:
                # Below budget (affordable, but might be lower yield)
                ratio = med_p / max(1.0, budget_min)
                budget_score = max(50.0, 75.0 * ratio)
            else:
                # Above budget (stretched affordability)
                excess = (med_p - budget_max) / budget_max
                budget_score = max(20.0, 100.0 - excess * 100.0)

            # 2. Appreciation Score (0 to 100)
            # Normalizing 5% - 16% growth to 40 - 100
            apprec_score = min(max(40.0 + (apprec - 4.0) * 5.0, 30.0), 100.0)

            # 3. Supply / Liquidity Score (0 to 100)
            inv_score = min(max(inv * 15.0, 40.0), 95.0)

            # 4. Activity / Stability Score
            act_score = act

            # Compute Weighted Final Suitability Score
            if risk_norm == "conservative":
                final_score = (
                    budget_score * weights["budget_fit"] +
                    inv_score * weights["supply_liquidity"] +
                    (100.0 - (apprec - 5.0) * 3.0) * weights["stability"] +
                    apprec_score * weights["appreciation"]
                )
            elif risk_norm == "aggressive":
                final_score = (
                    apprec_score * weights["appreciation"] +
                    budget_score * weights["budget_fit"] +
                    act_score * weights["growth_velocity"] +
                    inv_score * weights["supply_liquidity"]
                )
            else: # balanced
                final_score = (
                    apprec_score * weights["appreciation"] +
                    budget_score * weights["budget_fit"] +
                    inv_score * weights["supply_liquidity"] +
                    act_score * weights["growth_velocity"]
                )

            final_score = round(min(max(final_score, 35.0), 99.0), 1)

            # Pros & Cons synthesis via Python Rules
            pros = []
            cons = []
            if apprec >= 12.0:
                pros.append(f"Top-tier capital appreciation forecasted (+{apprec}% annualized)")
            elif apprec >= 8.0:
                pros.append(f"Steady, reliable appreciation trajectory (+{apprec}%)")
            
            if act >= 75:
                pros.append("High buyer demand & rapid inventory turnover")
            elif act <= 55:
                cons.append("Slower transaction velocity; requires longer holding period")

            if budget_score >= 90:
                pros.append("Perfect alignment with target investment budget")
            elif med_p > budget_max:
                cons.append(f"Median entry price (₹{med_p/10000000:.2f} Cr) slightly stretches specified ceiling")

            if inv >= 6:
                pros.append("Diverse inventory choices across luxury & executive tiers")
            else:
                cons.append("Limited active listings currently recorded")

            # Risk-adjusted summary rationale
            if "kokapet" in loc_name.lower():
                rationale = "Premier Neopolis luxury corridor; massive commercial SEZ driver, ideal for high-growth capital gains."
            elif "gachibowli" in loc_name.lower():
                rationale = "Proven Financial District tech epicenter; unmatched tenant demand and institutional liquidity."
            elif "tellapur" in loc_name.lower():
                rationale = "Rapidly expanding township and gated villa belt with strong greenfield infrastructure development."
            elif "kondapur" in loc_name.lower():
                rationale = "Balanced mature residential hub equidistant from HITEC City & Gachibowli with resilient pricing."
            elif "manikonda" in loc_name.lower():
                rationale = "Attractive price-to-location ratio close to Lanco Hills with steady rental yields."
            elif "miyapur" in loc_name.lower():
                rationale = "Excellent metro connectivity with high affordability for value-oriented portfolios."
            else:
                rationale = "Established residential market with steady end-user fundamentals."

            ranked_list.append({
                "locality_id": prof["locality_id"],
                "locality_name": loc_name,
                "suitability_score": final_score,
                "projected_appreciation_pct": apprec,
                "median_price": med_p,
                "avg_price_per_sqft": prof["avg_price_per_sqft"],
                "active_inventory": inv,
                "activity_score": act,
                "risk_profile": risk_preference.capitalize(),
                "pros": pros,
                "cons": cons,
                "rationale": rationale,
            })

        # Sort descending by suitability score
        ranked_list.sort(key=lambda x: x["suitability_score"], reverse=True)
        for rank_idx, item in enumerate(ranked_list, start=1):
            item["rank"] = rank_idx

        duration_ms = round((datetime.datetime.now() - start_time).total_seconds() * 1000, 2)

        return {
            "status": "success",
            "agent": "Recommendation Agent",
            "step": 5,
            "duration_ms": duration_ms,
            "summary": (
                f"Ranked {len(ranked_list)} localities for '{risk_preference.capitalize()}' investor profile "
                f"with budget ₹{budget_min/100000:.0f}L - ₹{budget_max/10000000:.2f}Cr. "
                f"Top pick: #{1} {ranked_list[0]['locality_name']} (Score: {ranked_list[0]['suitability_score']}/100)."
            ),
            "recommendations": ranked_list,
            "user_preferences": {
                "budget_min": budget_min,
                "budget_max": budget_max,
                "risk_preference": risk_preference,
                "property_type": property_type,
            },
            "top_pick": ranked_list[0] if ranked_list else None,
        }
