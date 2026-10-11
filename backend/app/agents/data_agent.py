import datetime
from typing import Dict, Any, List, Optional
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.models import Property, Locality, MarketSnapshot, DemandSignal

class DataAgent:
    """
    Step 1 — Data Agent
    Retrieves available property listings, locality details and historical price records.
    Connects to internal database or external API sources, standardizes schemas,
    and provides unified data collections for downstream agents.
    """

    def __init__(self, db: Session):
        self.db = db

    def execute(self) -> Dict[str, Any]:
        start_time = datetime.datetime.now()

        # 1. Fetch Localities
        localities = self.db.query(Locality).all()
        locality_records = [
            {
                "id": loc.id,
                "name": loc.name,
                "city": loc.city,
                "state": loc.state,
                "latitude": loc.latitude,
                "longitude": loc.longitude,
                "data_status": loc.data_status,
            }
            for loc in localities
        ]

        # 2. Fetch Property Listings
        properties = self.db.query(Property).all()
        prop_records = []
        for p in properties:
            pp_sqft = round(p.price / p.area_sqft, 2) if p.area_sqft and p.area_sqft > 0 else 0.0
            prop_records.append({
                "id": p.id,
                "external_id": p.external_id,
                "title": p.title,
                "locality_id": p.locality_id,
                "locality_name": p.locality.name if p.locality else f"Locality #{p.locality_id}",
                "property_type": p.property_type,
                "listing_type": p.listing_type,
                "price": p.price,
                "area_sqft": p.area_sqft,
                "bedrooms": p.bedrooms,
                "age": getattr(p, "age", 2.5) or 2.5,
                "price_per_sqft": pp_sqft,
                "listing_date": p.listing_date.isoformat() if p.listing_date else None,
                "status": p.status,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "source": p.source,
                "verification_status": p.verification_status,
            })

        # 3. Fetch Historical Snapshots
        snapshots = self.db.query(MarketSnapshot).order_by(MarketSnapshot.observation_date.asc()).all()
        snapshot_records = [
            {
                "locality_id": s.locality_id,
                "observation_date": s.observation_date.isoformat(),
                "property_type": s.property_type,
                "listing_type": s.listing_type,
                "active_listing_count": s.active_listing_count,
                "new_listing_count": s.new_listing_count,
                "average_asking_price": s.average_asking_price,
                "median_asking_price": s.median_asking_price,
                "median_price_per_sqft": s.median_price_per_sqft,
                "sample_size": s.sample_size,
            }
            for s in snapshots
        ]

        # 4. Fetch Demand Signals
        signals = self.db.query(DemandSignal).order_by(DemandSignal.observation_date.asc()).all()
        signal_records = [
            {
                "locality_id": sig.locality_id,
                "observation_date": sig.observation_date.isoformat(),
                "signal_type": sig.signal_type,
                "signal_value": sig.signal_value,
                "sample_size": sig.sample_size,
                "source": sig.source,
            }
            for sig in signals
        ]

        duration_ms = round((datetime.datetime.now() - start_time).total_seconds() * 1000, 2)

        return {
            "status": "success",
            "agent": "Data Agent",
            "step": 1,
            "duration_ms": duration_ms,
            "summary": f"Ingested {len(prop_records)} listings across {len(locality_records)} localities with {len(snapshot_records)} historical records.",
            "data": {
                "properties": prop_records,
                "localities": locality_records,
                "snapshots": snapshot_records,
                "demand_signals": signal_records,
            },
            "metrics": {
                "total_properties": len(prop_records),
                "total_localities": len(locality_records),
                "total_snapshots": len(snapshot_records),
                "total_signals": len(signal_records),
                "primary_localities": [loc["name"] for loc in locality_records],
            }
        }
