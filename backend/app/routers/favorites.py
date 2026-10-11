from typing import List, Optional
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from backend.app.database import get_db
from backend.app.models import Property, User, UserFavorite, NotificationLog
from backend.app.config import settings, update_smtp_settings
from backend.app.schemas import (
    FavoriteOut,
    FavoriteActionResponse,
    NotificationLogOut,
    PropertyOut,
    SendTestEmailRequest,
    SmtpSettingsOut,
    SmtpSettingsUpdate
)
from backend.app.auth import get_current_user, get_optional_user
from backend.app.services.email_service import send_immediate_owner_notification

router = APIRouter(prefix="/favorites", tags=["Favorites"])


def build_property_out(p: Property) -> PropertyOut:

    """Helper to convert Property ORM model to PropertyOut schema."""

    pp_sqft = round(p.price / p.area_sqft, 2) if p.area_sqft and p.area_sqft > 0 else 0.0

    loc_name = p.locality.name if p.locality else "Hyderabad"

    loc_city = p.locality.city if p.locality else "Hyderabad"

    address = p.address or f"{p.title}, Near Financial District, {loc_name}"



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

        address=address,

        owner_name=getattr(p, 'owner_name', 'PropScope Partner') or 'PropScope Partner',

        owner_email=getattr(p, 'owner_email', 'owner@realestateiq.com') or 'owner@realestateiq.com',

        owner_phone=getattr(p, 'owner_phone', '+91 98765 43210') or '+91 98765 43210',

        is_available=getattr(p, 'is_available', True) if getattr(p, 'is_available', None) is not None else True,

        amenities=getattr(p, 'amenities', 'Gym, Swimming Pool, Clubhouse, 24/7 Security') or 'Gym, Swimming Pool, Clubhouse, 24/7 Security',

        created_at=p.created_at

    )



def dispatch_owner_email_notification(db: Session, user: User, prop: Property) -> NotificationLog:

    """

    Sends an immediate smartphone-responsive email notification to the owner's registered address

    when a user saves/likes their property, and records the event in NotificationLog.

    """

    owner_email = prop.owner_email or "owner@realestateiq.com"

    owner_name = prop.owner_name or "Property Owner"

    user_phone_text = user.phone if (user.share_contact_consent and user.phone) else "Withheld by user for privacy"

    locality_name = prop.locality.name if prop.locality else "Hyderabad"



    price_formatted = f"INR {(prop.price / 10000000):.2f} Cr" if prop.price >= 10000000 else f"INR {(prop.price / 100000):.2f} Lakh"

    address = prop.address or f"{prop.title}, {locality_name}, Hyderabad"

    nav_url = f"https://www.google.com/maps/dir/?api=1&destination={urllib.parse.quote(address)}"



    # Immediate dispatch of smartphone-optimized email

    delivery_res = send_immediate_owner_notification(

        owner_email=owner_email,

        owner_name=owner_name,

        property_title=prop.title,

        locality_name=locality_name,

        price_formatted=price_formatted,

        property_type=prop.property_type or "apartment",

        listing_type=prop.listing_type or "sale",

        bedrooms=prop.bedrooms or 2,

        area_sqft=prop.area_sqft or 1200,

        address=address,

        image_url=prop.image_url,

        buyer_name=user.name,

        buyer_email=user.email,

        buyer_phone=user.phone if user.share_contact_consent else None,

        nav_url=nav_url

    )



    subject = f"RealEstateIQ Lead Alert: {user.name} saved '{prop.title}' ({locality_name})"

    message = (

        f"Dear {owner_name},\n\n"

        f"A verified user has saved your property listing as their Favourite on RealEstateIQ!\n\n"

        f"--- PROPERTY DETAILS ---\n"

        f"• Property: {prop.title}\n"

        f"• Locality: {locality_name}, Hyderabad\n"

        f"• Type: {prop.property_type.title()} ({prop.listing_type.upper()})\n"

        f"• Price: {price_formatted}\n"

        f"• Size: {prop.area_sqft:,.0f} sq.ft ({prop.bedrooms or 0} BHK)\n"

        f"• Address: {address}\n"

        f"• Google Maps Directions: {nav_url}\n\n"

        f"--- INTERESTED BUYER / TENANT ---\n"

        f"• Full Name: {user.name}\n"

        f"• Email: {user.email}\n"

        f"• Phone Number: {user_phone_text}\n\n"

        f"--- NEXT STEPS ---\n"

        f"The user has expressed strong interest in this listing. You can contact them directly "

        f"from your phone via Phone call, WhatsApp, or Email to arrange a site visit.\n\n"
        f"Delivery Status: {delivery_res.get('status', 'sent')} - {delivery_res.get('message', '')}\n"
        f"RealEstateIQ Automated Notification Service"
    )

    notif = NotificationLog(
        property_id=prop.id,
        user_id=user.id,
        owner_email=owner_email,
        owner_name=owner_name,
        user_name=user.name,
        user_email=user.email,
        user_phone=user.phone if user.share_contact_consent else None,
        subject=subject,
        message=message,
        status=delivery_res.get("status", "sent")
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

@router.get("", response_model=List[FavoriteOut])
def get_user_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all favourite properties saved by the logged-in user."""
    favs = (
        db.query(UserFavorite)
        .filter(UserFavorite.user_id == current_user.id)
        .order_by(desc(UserFavorite.created_at))
        .all()
    )

    result = []
    for f in favs:
        if f.property:
            result.append(
                FavoriteOut(
                    id=f.id,
                    property_id=f.property_id,
                    created_at=f.created_at,
                    property=build_property_out(f.property)
                )
            )
    return result

@router.get("/ids", response_model=List[int])
def get_user_favorite_property_ids(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns a simple list of property IDs favorited by the logged-in user."""
    favs = db.query(UserFavorite.property_id).filter(UserFavorite.user_id == current_user.id).all()
    return [f[0] for f in favs]

@router.get("/notifications", response_model=List[NotificationLogOut])
def get_notification_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    View notification audit logs.
    Admins see all platform notifications.
    Standard users see notifications for leads they generated or where they are the listing owner.
    """
    if current_user.role == "admin":
        logs = db.query(NotificationLog).order_by(desc(NotificationLog.sent_at)).limit(100).all()
    else:
        logs = (
            db.query(NotificationLog)
            .filter(
                or_(
                    NotificationLog.user_id == current_user.id,
                    NotificationLog.owner_email == current_user.email
                )
            )
            .order_by(desc(NotificationLog.sent_at))
            .limit(100)
            .all()
        )
    return logs

@router.get("/smtp-settings", response_model=SmtpSettingsOut)
def get_smtp_settings(
    current_user: User = Depends(get_current_user)
):
    """View active SMTP settings for smartphone email delivery (Admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")

    return SmtpSettingsOut(
        smtp_host=settings.SMTP_HOST,
        smtp_port=settings.SMTP_PORT,
        smtp_user=settings.SMTP_USER,
        smtp_from=settings.SMTP_FROM,
        smtp_use_tls=settings.SMTP_USE_TLS,
        is_configured=bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
    )

@router.post("/smtp-settings", response_model=SmtpSettingsOut)
def save_smtp_settings(
    req: SmtpSettingsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update runtime SMTP credentials and persist to .env (Admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")

    from_email = req.smtp_from.strip() if req.smtp_from else (req.smtp_user.strip() or "alerts@realestateiq.com")
    update_smtp_settings(
        host=req.smtp_host.strip(),
        port=req.smtp_port,
        user=req.smtp_user.strip(),
        password=req.smtp_password.strip(),
        from_email=from_email,
        use_tls=req.smtp_use_tls
    )

    return SmtpSettingsOut(
        smtp_host=settings.SMTP_HOST,
        smtp_port=settings.SMTP_PORT,
        smtp_user=settings.SMTP_USER,
        smtp_from=settings.SMTP_FROM,
        smtp_use_tls=settings.SMTP_USE_TLS,
        is_configured=bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
    )

@router.post("/send-test-email")
def send_test_email_to_phone(
    req: SendTestEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test endpoint allowing evaluator/owner to send an email notification directly to
    their personal phone email (e.g. rahulphotos806@gmail.com) to test real mobile inbox delivery.
    """
    prop = None
    if req.property_id:
        prop = db.query(Property).filter(Property.id == req.property_id).first()
    if not prop:
        prop = db.query(Property).first()

    locality_name = prop.locality.name if (prop and getattr(prop, 'locality', None)) else "Kokapet"
    title = prop.title if prop else "Prestige Clairemont High-Rise"
    address = (prop.address if (prop and getattr(prop, 'address', None)) else f"{title}, {locality_name}, Hyderabad")
    price_formatted = f"INR {(prop.price / 10000000):.2f} Cr" if (prop and prop.price and prop.price >= 10000000) else "INR 1.85 Cr"
    nav_url = f"https://www.google.com/maps/dir/?api=1&destination={urllib.parse.quote(address)}"

    delivery_res = send_immediate_owner_notification(
        owner_email=req.target_email.strip(),
        owner_name=current_user.name,
        property_title=title,
        locality_name=locality_name,
        price_formatted=price_formatted,
        property_type=prop.property_type if prop else "apartment",
        listing_type=prop.listing_type if prop else "sale",
        bedrooms=prop.bedrooms or 3 if prop else 3,
        area_sqft=prop.area_sqft if prop else 2100,
        address=address,
        image_url=prop.image_url if prop else None,
        buyer_name=current_user.name,
        buyer_email=current_user.email,
        buyer_phone=current_user.phone,
        nav_url=nav_url
    )

    # Also log this test notification in the database audit log
    test_notif = NotificationLog(
        property_id=prop.id if prop else 1,
        user_id=current_user.id,
        owner_email=req.target_email.strip(),
        owner_name=f"{current_user.name} (Test)",
        user_name=current_user.name,
        user_email=current_user.email,
        user_phone=current_user.phone,
        subject=f"[TEST LEAD] RealEstateIQ Alert: {title}",
        message=f"Test notification sent to {req.target_email}. Delivery Status: {delivery_res.get('status')} - {delivery_res.get('message')}",
        status=delivery_res.get("status", "sent")
    )
    db.add(test_notif)
    db.commit()

    return {
        "success": True,
        "target_email": req.target_email.strip(),
        "delivery_result": delivery_res,
        "message": delivery_res.get("message", f"Dispatched test notification to {req.target_email}")
    }

@router.post("/{property_id}", response_model=FavoriteActionResponse)
def add_favorite_and_notify_owner(
    property_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save a property to user favourites and automatically send an email
    notification to the property owner with buyer contact details.
    """
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    existing = (
        db.query(UserFavorite)
        .filter(UserFavorite.user_id == current_user.id, UserFavorite.property_id == property_id)
        .first()
    )

    if not existing:
        fav = UserFavorite(user_id=current_user.id, property_id=property_id)
        db.add(fav)
        db.commit()

    # Feature 4: Dispatch automatic email notification to property owner
    # Always dispatch and log whenever the user likes/saves the property
    notif = dispatch_owner_email_notification(db, current_user, prop)

    msg_delivery = (
        f"Property added to favourites! Automated email dispatched to owner ({prop.owner_name} <{prop.owner_email}>)."
        if not existing
        else f"Property already in favourites! Fresh lead notification re-dispatched to owner ({prop.owner_name} <{prop.owner_email}>)."
    )

    return FavoriteActionResponse(
        success=True,
        message=msg_delivery,
        property_id=property_id,
        is_favorited=True,
        notification_sent=True,
        owner_notified=prop.owner_email
    )

@router.delete("/{property_id}", response_model=FavoriteActionResponse)
def remove_favorite(
    property_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a property from user favourites."""
    existing = (
        db.query(UserFavorite)
        .filter(UserFavorite.user_id == current_user.id, UserFavorite.property_id == property_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()

    return FavoriteActionResponse(
        success=True,
        message="Property removed from favourites.",
        property_id=property_id,
        is_favorited=False,
        notification_sent=False
    )

