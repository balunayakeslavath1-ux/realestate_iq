from typing import Optional, List
import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from backend.app.database import get_db
from backend.app.models import Property, Locality, User
from backend.app.schemas import (
    PropertyOut,
    PropertyListResponse,
    PropertyCreate,
    PropertyUpdate
)
from backend.app.auth import get_current_user, get_current_admin, get_optional_user

router = APIRouter(prefix="/properties", tags=["Properties"])

def to_property_out(p: Property) -> PropertyOut:
    """Helper to convert Property ORM model to PropertyOut schema."""
    pp_sqft = round(p.price / p.area_sqft, 2) if p.area_sqft and p.area_sqft > 0 else 0.0
    loc_name = p.locality.name if p.locality else "Hyderabad"
    loc_city = p.locality.city if p.locality else "Hyderabad"
    default_address = f"{p.title}, {loc_name}, Hyderabad, Telangana"

    return PropertyOut(
        id=p.id,
        external_id=p.external_id,
        title=p.title,
        locality_id=p.locality_id,
        locality_name=loc_name,
        city=loc_city,
        property_type=p.property_type,
        listing_type=p.listing_type,
        price=p.price,
        area_sqft=p.area_sqft,
        bedrooms=p.bedrooms,
        price_per_sqft=pp_sqft,
        listing_date=p.listing_date,
        status=p.status,
        latitude=p.latitude,
        longitude=p.longitude,
        is_approximate_coords=p.is_approximate_coords,
        source=p.source,
        source_url=p.source_url,
        verification_status=p.verification_status,
        image_url=p.image_url,
        age=getattr(p, 'age', 2.0) or 2.0,
        is_suspicious=getattr(p, 'is_suspicious', False) or False,
        suspicious_reason=getattr(p, 'suspicious_reason', None),
        address=getattr(p, 'address', None) or default_address,
        owner_name=getattr(p, 'owner_name', 'PropScope Partner') or 'PropScope Partner',
        owner_email=getattr(p, 'owner_email', 'owner@realestateiq.com') or 'owner@realestateiq.com',
        owner_phone=getattr(p, 'owner_phone', '+91 98765 43210') or '+91 98765 43210',
        is_available=getattr(p, 'is_available', True) if getattr(p, 'is_available', None) is not None else True,
        amenities=getattr(p, 'amenities', 'Gym, Swimming Pool, Clubhouse, 24/7 Security') or 'Gym, Swimming Pool, Clubhouse, 24/7 Security',
        created_at=p.created_at
    )

@router.get("", response_model=PropertyListResponse)
def get_properties(
    locality_id: Optional[int] = Query(None, description="Filter by Locality ID"),
    locality_name: Optional[str] = Query(None, description="Filter by Locality name"),
    city: Optional[str] = Query(None, description="Filter by City name"),
    property_type: Optional[str] = Query(None, description="apartment, villa, independent house, plot"),
    listing_type: Optional[str] = Query(None, description="sale, rent"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum asking price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum asking price"),
    min_area: Optional[float] = Query(None, ge=0, description="Minimum area in sqft"),
    max_area: Optional[float] = Query(None, ge=0, description="Maximum area in sqft"),
    bedrooms: Optional[int] = Query(None, ge=0, description="Number of bedrooms"),
    status_filter: Optional[str] = Query(None, description="active, inactive, all"),
    sort_by: Optional[str] = Query(
        "newest",
        description="price_asc, price_desc, size_asc, size_desc, newest, price_sqft_asc, price_sqft_desc"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    query = db.query(Property).join(Locality)

    if locality_id:
        query = query.filter(Property.locality_id == locality_id)
    if locality_name:
        query = query.filter(Locality.name.ilike(f"%{locality_name}%"))
    if city:
        query = query.filter(Locality.city.ilike(f"%{city}%"))
    if property_type:
        query = query.filter(Property.property_type.ilike(property_type))
    if listing_type:
        query = query.filter(Property.listing_type.ilike(listing_type))
    if min_price is not None:
        query = query.filter(Property.price >= min_price)
    if max_price is not None:
        query = query.filter(Property.price <= max_price)
    if min_area is not None:
        query = query.filter(Property.area_sqft >= min_area)
    if max_area is not None:
        query = query.filter(Property.area_sqft <= max_area)
    if bedrooms is not None:
        query = query.filter(Property.bedrooms == bedrooms)
    if status_filter and status_filter != "all":
        query = query.filter(Property.status == status_filter)

    # Sorting
    if sort_by == "price_asc":
        query = query.order_by(asc(Property.price))
    elif sort_by == "price_desc":
        query = query.order_by(desc(Property.price))
    elif sort_by == "size_asc":
        query = query.order_by(asc(Property.area_sqft))
    elif sort_by == "size_desc":
        query = query.order_by(desc(Property.area_sqft))
    elif sort_by == "price_sqft_asc":
        query = query.order_by(asc(Property.price / Property.area_sqft))
    elif sort_by == "price_sqft_desc":
        query = query.order_by(desc(Property.price / Property.area_sqft))
    else:  # newest by default
        query = query.order_by(desc(Property.listing_date), desc(Property.id))

    total = query.count()
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    properties_out = [to_property_out(p) for p in items]

    return PropertyListResponse(
        total=total,
        page=page,
        page_size=page_size,
        properties=properties_out
    )

@router.get("/{id}", response_model=PropertyOut)
def get_property_by_id(id: int, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Property with ID {id} not found")

    return to_property_out(prop)

# Feature 1: Admin CRUD endpoints

@router.post("", response_model=PropertyOut)
def create_property(
    prop_in: PropertyCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Feature 1: Admin adds a new flat to an existing locality.
    """
    locality = db.query(Locality).filter(Locality.id == prop_in.locality_id).first()
    if not locality:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Locality with ID {prop_in.locality_id} not found."
        )

    # Default coordinates from locality if none supplied
    lat = prop_in.latitude if prop_in.latitude is not None else locality.latitude
    lng = prop_in.longitude if prop_in.longitude is not None else locality.longitude
    address = prop_in.address or f"{prop_in.title}, {locality.name}, Hyderabad, Telangana"

    new_prop = Property(
        external_id=prop_in.external_id or f"prop-custom-{int(datetime.datetime.utcnow().timestamp())}",
        title=prop_in.title,
        locality_id=prop_in.locality_id,
        property_type=prop_in.property_type,
        listing_type=prop_in.listing_type,
        price=prop_in.price,
        area_sqft=prop_in.area_sqft,
        bedrooms=prop_in.bedrooms,
        listing_date=prop_in.listing_date or datetime.date.today(),
        status=prop_in.status or "active",
        latitude=lat,
        longitude=lng,
        is_approximate_coords=prop_in.is_approximate_coords,
        source=prop_in.source or "RealEstateIQ Admin Portal",
        source_url=prop_in.source_url,
        verification_status=prop_in.verification_status or "Admin Verified",
        image_url=prop_in.image_url or "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80",
        age=prop_in.age if prop_in.age is not None else 1.0,
        address=address,
        owner_name=prop_in.owner_name or "Property Owner",
        owner_email=prop_in.owner_email or "owner@realestateiq.com",
        owner_phone=prop_in.owner_phone or "+91 98765 43210",
        is_available=prop_in.is_available,
        amenities=prop_in.amenities or "Gym, Swimming Pool, Clubhouse, 24/7 Security"
    )

    db.add(new_prop)
    db.commit()
    db.refresh(new_prop)
    return to_property_out(new_prop)

@router.put("/{id}", response_model=PropertyOut)
def update_property(
    id: int,
    prop_in: PropertyUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Feature 1: Admin edits property details, prices, BHK, area, photos, address, and owner.
    """
    prop = db.query(Property).filter(Property.id == id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    update_data = prop_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(prop, field) and value is not None:
            setattr(prop, field, value)

    prop.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(prop)
    return to_property_out(prop)

@router.delete("/{id}")
def delete_property(
    id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Feature 1: Admin deletes a property listing permanently.
    """
    prop = db.query(Property).filter(Property.id == id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    db.delete(prop)
    db.commit()
    return {"success": True, "message": f"Property '{prop.title}' (ID {id}) deleted successfully."}

@router.patch("/{id}/toggle-status", response_model=PropertyOut)
def toggle_property_status(
    id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Feature 1: Admin deactivates/activates listing or toggles availability.
    """
    prop = db.query(Property).filter(Property.id == id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    if prop.status == "active":
        prop.status = "inactive"
        prop.is_available = False
    else:
        prop.status = "active"
        prop.is_available = True

    prop.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(prop)
    return to_property_out(prop)
