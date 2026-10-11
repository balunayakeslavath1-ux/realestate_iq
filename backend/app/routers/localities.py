from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.models import Locality, Property
from backend.app.schemas import LocalityOut

router = APIRouter(prefix="/localities", tags=["Localities"])

@router.get("", response_model=List[LocalityOut])
def get_localities(
    city: Optional[str] = Query(None, description="Filter by city name"),
    search: Optional[str] = Query(None, description="Search locality name"),
    db: Session = Depends(get_db)
):
    query = db.query(Locality)
    if city:
        query = query.filter(Locality.city.ilike(f"%{city}%"))
    if search:
        query = query.filter(Locality.name.ilike(f"%{search}%"))

    localities = query.order_by(Locality.name.asc()).all()

    # Attach property count
    results = []
    for loc in localities:
        count = db.query(Property).filter(Property.locality_id == loc.id).count()
        results.append(
            LocalityOut(
                id=loc.id,
                name=loc.name,
                city=loc.city,
                state=loc.state,
                latitude=loc.latitude,
                longitude=loc.longitude,
                property_count=count
            )
        )
    return results
