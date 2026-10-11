import datetime
from typing import Optional, List, Tuple
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from backend.app.database import get_db
from backend.app.models import Property, Locality, MarketSnapshot, DemandSignal
from backend.app.schemas import (
    MarketSummaryResponse, SupplyAnalysisResponse, DemandAnalysisResponse,
    MarketTrendsResponse, TrendDataPoint, MarketCompareResponse, LocalityComparisonItem
)
from backend.app.calculations import (
    calculate_property_metrics,
    calculate_safe_percentage_change,
    calculate_supply_distribution,
    evaluate_demand_score
)

router = APIRouter(prefix="/market", tags=["Market Intelligence"])

def _resolve_locality(db: Session, locality_id: Optional[int], locality_name: Optional[str]) -> Tuple[Optional[Locality], Optional[int], str]:
    if locality_id:
        loc = db.query(Locality).filter(Locality.id == locality_id).first()
        return loc, locality_id, loc.name if loc else f"Locality #{locality_id}"
    if locality_name:
        loc = db.query(Locality).filter(Locality.name.ilike(locality_name)).first()
        return loc, loc.id if loc else None, loc.name if loc else locality_name
    return None, None, "All Hyderabad Localities"

@router.get("/summary", response_model=MarketSummaryResponse)
def get_market_summary(
    locality_id: Optional[int] = Query(None, description="Locality ID"),
    locality_name: Optional[str] = Query(None, description="Locality Name"),
    listing_type: str = Query("sale", description="sale or rent"),
    property_type: Optional[str] = Query("all", description="apartment, villa, etc. or 'all'"),
    db: Session = Depends(get_db)
):
    listing_type_norm = listing_type.lower()
    if listing_type_norm not in ("sale", "rent"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="listing_type must be either 'sale' or 'rent'"
        )

    loc, loc_id, loc_display = _resolve_locality(db, locality_id, locality_name)
    city_display = loc.city if loc else "Hyderabad"

    # Query active properties
    prop_query = db.query(Property).filter(
        Property.listing_type == listing_type_norm,
        Property.status == "active"
    )
    if loc_id:
        prop_query = prop_query.filter(Property.locality_id == loc_id)
    if property_type and property_type.lower() != "all":
        prop_query = prop_query.filter(Property.property_type.ilike(property_type))

    properties = prop_query.all()
    metrics = calculate_property_metrics(properties)

    # Historical price change calculation from snapshots (~90 days ago)
    snap_query = db.query(MarketSnapshot).filter(
        MarketSnapshot.listing_type == listing_type_norm
    )
    if loc_id:
        snap_query = snap_query.filter(MarketSnapshot.locality_id == loc_id)
    
    # Get snapshot closest to 90 days ago
    baseline_date = datetime.date.today() - datetime.timedelta(days=90)
    baseline_snap = snap_query.filter(MarketSnapshot.observation_date <= baseline_date)\
                              .order_by(desc(MarketSnapshot.observation_date))\
                              .first()

    price_change_pct = None
    if baseline_snap and baseline_snap.median_asking_price > 0 and metrics["median_asking_price"] > 0:
        price_change_pct = calculate_safe_percentage_change(
            metrics["median_asking_price"],
            baseline_snap.median_asking_price
        )

    # Demand score evaluation
    signals_query = db.query(DemandSignal)
    if loc_id:
        signals_query = signals_query.filter(DemandSignal.locality_id == loc_id)
    signals = signals_query.all()
    demand_eval = evaluate_demand_score(signals)

    return MarketSummaryResponse(
        locality_id=loc_id,
        locality_name=loc_display,
        city=city_display,
        listing_type=listing_type_norm,
        property_type=property_type or "all",
        active_listings=metrics["active_listings"],
        average_asking_price=metrics["average_asking_price"],
        median_asking_price=metrics["median_asking_price"],
        median_price_per_sqft=metrics["median_price_per_sqft"],
        new_listings_30d=metrics["new_listings_30d"],
        price_change_pct=price_change_pct,
        price_change_period="Past 90 Days",
        demand_score=demand_eval["demand_score"],
        demand_status=demand_eval["status_message"] if not demand_eval["has_sufficient_data"] else (demand_eval["score_classification"] or "Active"),
        sample_size=metrics["sample_size"],
        is_simulated=True,
        data_disclaimer="Figures reflect asking prices from active listings and historical survey aggregates, not registered transaction prices."
    )

@router.get("/supply", response_model=SupplyAnalysisResponse)
def get_supply_analysis(
    locality_id: Optional[int] = Query(None),
    locality_name: Optional[str] = Query(None),
    listing_type: str = Query("sale"),
    db: Session = Depends(get_db)
):
    listing_type_norm = listing_type.lower()
    loc, loc_id, loc_display = _resolve_locality(db, locality_id, locality_name)

    prop_query = db.query(Property).filter(
        Property.listing_type == listing_type_norm,
        Property.status == "active"
    )
    if loc_id:
        prop_query = prop_query.filter(Property.locality_id == loc_id)

    properties = prop_query.all()
    metrics = calculate_property_metrics(properties)
    dist = calculate_supply_distribution(properties, listing_type_norm)

    # Calculate change in active listings compared to previous period snapshot
    snap_query = db.query(MarketSnapshot).filter(MarketSnapshot.listing_type == listing_type_norm)
    if loc_id:
        snap_query = snap_query.filter(MarketSnapshot.locality_id == loc_id)
    prev_snap = snap_query.order_by(desc(MarketSnapshot.observation_date)).first()
    
    listing_change_pct = None
    if prev_snap and prev_snap.active_listing_count > 0:
        listing_change_pct = calculate_safe_percentage_change(
            metrics["active_listings"],
            prev_snap.active_listing_count
        )

    return SupplyAnalysisResponse(
        locality_id=loc_id,
        locality_name=loc_display,
        listing_type=listing_type_norm,
        active_listings=metrics["active_listings"],
        new_listings_30d=metrics["new_listings_30d"],
        listings_change_pct=listing_change_pct,
        property_type_distribution=dist["by_property_type"],
        price_range_distribution=dist["by_price_range"],
        sample_size=metrics["sample_size"]
    )

@router.get("/demand", response_model=DemandAnalysisResponse)
def get_demand_analysis(
    locality_id: Optional[int] = Query(None),
    locality_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    loc, loc_id, loc_display = _resolve_locality(db, locality_id, locality_name)

    signals_query = db.query(DemandSignal)
    if loc_id:
        signals_query = signals_query.filter(DemandSignal.locality_id == loc_id)
    signals = signals_query.all()

    eval_result = evaluate_demand_score(signals)

    return DemandAnalysisResponse(
        locality_id=loc_id,
        locality_name=loc_display,
        has_sufficient_data=eval_result["has_sufficient_data"],
        demand_score=eval_result["demand_score"],
        score_classification=eval_result["score_classification"],
        contributing_signals=eval_result["contributing_signals"],
        methodology_explanation=eval_result["methodology_explanation"],
        total_sample_size=eval_result["total_sample_size"],
        data_period=eval_result["data_period"],
        status_message=eval_result["status_message"]
    )

@router.get("/trends", response_model=MarketTrendsResponse)
def get_market_trends(
    locality_id: Optional[int] = Query(None),
    locality_name: Optional[str] = Query(None),
    listing_type: str = Query("sale"),
    property_type: str = Query("all"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    listing_type_norm = listing_type.lower()
    loc, loc_id, loc_display = _resolve_locality(db, locality_id, locality_name)

    snap_query = db.query(MarketSnapshot).filter(
        MarketSnapshot.listing_type == listing_type_norm
    )
    if loc_id:
        snap_query = snap_query.filter(MarketSnapshot.locality_id == loc_id)
    if property_type and property_type.lower() != "all":
        snap_query = snap_query.filter(MarketSnapshot.property_type.ilike(property_type))

    if start_date:
        try:
            s_date = datetime.date.fromisoformat(start_date)
            snap_query = snap_query.filter(MarketSnapshot.observation_date >= s_date)
        except ValueError:
            pass
    if end_date:
        try:
            e_date = datetime.date.fromisoformat(end_date)
            snap_query = snap_query.filter(MarketSnapshot.observation_date <= e_date)
        except ValueError:
            pass

    snapshots = snap_query.order_by(asc(MarketSnapshot.observation_date)).all()

    if not snapshots:
        return MarketTrendsResponse(
            locality_id=loc_id,
            locality_name=loc_display,
            listing_type=listing_type_norm,
            property_type=property_type,
            data_points=[],
            overall_price_change_pct=None,
            has_sufficient_history=False,
            message=f"No historical snapshots recorded for {loc_display} ({listing_type_norm}) in the selected timeframe."
        )

    # Convert snapshots to trend points
    points: List[TrendDataPoint] = []
    for s in snapshots:
        points.append(
            TrendDataPoint(
                observation_date=s.observation_date.isoformat(),
                period_label=s.observation_date.strftime("%b %Y"),
                average_asking_price=s.average_asking_price,
                median_asking_price=s.median_asking_price,
                median_price_per_sqft=s.median_price_per_sqft,
                active_listing_count=s.active_listing_count,
                new_listing_count=s.new_listing_count,
                sample_size=s.sample_size
            )
        )

    first_med = points[0].median_asking_price
    last_med = points[-1].median_asking_price
    overall_change = calculate_safe_percentage_change(last_med, first_med)

    return MarketTrendsResponse(
        locality_id=loc_id,
        locality_name=loc_display,
        listing_type=listing_type_norm,
        property_type=property_type,
        data_points=points,
        overall_price_change_pct=overall_change,
        has_sufficient_history=len(points) >= 3,
        message=None if len(points) >= 3 else "Limited observations available; trend may have higher uncertainty."
    )

@router.get("/compare", response_model=MarketCompareResponse)
def compare_localities(
    locality_ids: str = Query(..., description="Comma-separated IDs of up to 3 localities, e.g. '1,2,3'"),
    listing_type: str = Query("sale", description="sale or rent"),
    property_type: str = Query("all", description="apartment, villa, or 'all'"),
    db: Session = Depends(get_db)
):
    listing_type_norm = listing_type.lower()
    raw_ids = [s.strip() for s in locality_ids.split(",") if s.strip()]
    if not raw_ids:
        raise HTTPException(status_code=400, detail="Please provide at least 1 locality ID to compare.")
    if len(raw_ids) > 3:
        raise HTTPException(status_code=400, detail="Cannot compare more than 3 localities simultaneously.")

    parsed_ids = []
    for r_id in raw_ids:
        try:
            parsed_ids.append(int(r_id))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid locality ID '{r_id}'")

    localities = db.query(Locality).filter(Locality.id.in_(parsed_ids)).all()
    if not localities:
        raise HTTPException(status_code=404, detail="No matching localities found.")

    items: List[LocalityComparisonItem] = []

    for loc in localities:
        # Fetch active properties
        p_query = db.query(Property).filter(
            Property.locality_id == loc.id,
            Property.listing_type == listing_type_norm,
            Property.status == "active"
        )
        if property_type.lower() != "all":
            p_query = p_query.filter(Property.property_type.ilike(property_type))

        props = p_query.all()
        metrics = calculate_property_metrics(props)

        # Historical price change (90d baseline)
        baseline_date = datetime.date.today() - datetime.timedelta(days=90)
        base_snap = db.query(MarketSnapshot).filter(
            MarketSnapshot.locality_id == loc.id,
            MarketSnapshot.listing_type == listing_type_norm,
            MarketSnapshot.observation_date <= baseline_date
        ).order_by(desc(MarketSnapshot.observation_date)).first()

        price_chg = None
        if base_snap and base_snap.median_asking_price > 0 and metrics["median_asking_price"] > 0:
            price_chg = calculate_safe_percentage_change(metrics["median_asking_price"], base_snap.median_asking_price)

        # Demand signals
        sigs = db.query(DemandSignal).filter(DemandSignal.locality_id == loc.id).all()
        d_eval = evaluate_demand_score(sigs)

        items.append(
            LocalityComparisonItem(
                locality_id=loc.id,
                locality_name=loc.name,
                city=loc.city,
                listing_type=listing_type_norm,
                property_type=property_type,
                median_asking_price=metrics["median_asking_price"],
                average_asking_price=metrics["average_asking_price"],
                median_price_per_sqft=metrics["median_price_per_sqft"],
                active_listing_count=metrics["active_listings"],
                new_listing_count_30d=metrics["new_listings_30d"],
                price_change_pct=price_chg,
                demand_score=d_eval["demand_score"],
                demand_status=d_eval["status_message"] if not d_eval["has_sufficient_data"] else (d_eval["score_classification"] or "Active"),
                sample_size=metrics["sample_size"],
                data_freshness=datetime.date.today().strftime("%d %b %Y")
            )
        )

    return MarketCompareResponse(
        listing_type=listing_type_norm,
        property_type=property_type,
        localities=items,
        comparison_notes="Comparisons are strictly computed on identical listing type and property type categories to prevent skewed metrics."
    )
