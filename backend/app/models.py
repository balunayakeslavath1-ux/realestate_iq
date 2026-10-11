import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, Index, Text
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Locality(Base):
    __tablename__ = "localities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    city = Column(String(100), nullable=False, default="Hyderabad", index=True)
    state = Column(String(100), nullable=False, default="Telangana")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    data_status = Column(String(50), nullable=False, default="SIMULATED DEMO")

    properties = relationship("Property", back_populates="locality", cascade="all, delete-orphan")
    snapshots = relationship("MarketSnapshot", back_populates="locality", cascade="all, delete-orphan")
    demand_signals = relationship("DemandSignal", back_populates="locality", cascade="all, delete-orphan")


class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(100), unique=True, index=True, nullable=True)
    title = Column(String(255), nullable=False)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False, index=True)
    property_type = Column(String(50), nullable=False, index=True)  # apartment, villa, independent_house, plot
    listing_type = Column(String(20), nullable=False, index=True)   # sale, rent
    price = Column(Float, nullable=False)                           # price_inr
    area_sqft = Column(Float, nullable=False)
    bedrooms = Column(Integer, nullable=True)                       # None for plot
    listing_date = Column(Date, nullable=False, default=datetime.date.today, index=True)
    status = Column(String(50), nullable=False, default="active", index=True)  # active, etc.
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_approximate_coords = Column(Boolean, default=False)
    source = Column(String(100), nullable=False, default="Synthetic demo dataset")
    source_url = Column(String(255), nullable=True)
    verification_status = Column(String(100), nullable=False, default="SIMULATED — NOT A REAL LISTING")
    price_unit_note = Column(String(100), nullable=True)
    currency = Column(String(10), nullable=False, default="INR")
    image_url = Column(String(255), nullable=True)
    age = Column(Float, nullable=True, default=2.0)                 # property age in years
    is_suspicious = Column(Boolean, nullable=False, default=False)  # flagged by Quality agent
    suspicious_reason = Column(String(255), nullable=True)          # reason flagged
    address = Column(String(255), nullable=True)                    # property address for map & navigation
    owner_name = Column(String(100), nullable=True, default="PropScope Partner")
    owner_email = Column(String(120), nullable=True, default="owner@realestateiq.com")
    owner_phone = Column(String(30), nullable=True, default="+91 98765 43210")
    is_available = Column(Boolean, nullable=False, default=True)
    amenities = Column(String(255), nullable=True, default="Gym, Swimming Pool, Clubhouse, 24/7 Security")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    locality = relationship("Locality", back_populates="properties")
    favorites = relationship("UserFavorite", back_populates="property", cascade="all, delete-orphan")
    notifications = relationship("NotificationLog", back_populates="property", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_prop_loc_type_listing", "locality_id", "property_type", "listing_type"),
    )


class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False, index=True)
    observation_date = Column(Date, nullable=False, index=True)
    property_type = Column(String(50), nullable=False, default="apartment")  # apartment, all, etc.
    listing_type = Column(String(20), nullable=False)                        # sale, rent
    active_listing_count = Column(Integer, nullable=False, default=0)
    new_listing_count = Column(Integer, nullable=False, default=0)
    average_asking_price = Column(Float, nullable=False, default=0.0)
    median_asking_price = Column(Float, nullable=False, default=0.0)
    median_price_per_sqft = Column(Float, nullable=False, default=0.0)
    sample_size = Column(Integer, nullable=False, default=0)
    data_source = Column(String(200), nullable=False, default="SIMULATED DEMO DATA — DO NOT USE AS REAL MARKET STATISTICS")

    locality = relationship("Locality", back_populates="snapshots")

    __table_args__ = (
        Index("idx_snap_loc_date", "locality_id", "observation_date", "listing_type"),
    )


class DemandSignal(Base):
    __tablename__ = "demand_signals"

    id = Column(Integer, primary_key=True, index=True)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False, index=True)
    observation_date = Column(Date, nullable=False, index=True)
    signal_type = Column(String(100), nullable=False)  # demo_listing_engagement_index, buyer_inquiries, etc.
    signal_value = Column(Float, nullable=False)
    source = Column(String(100), nullable=False, default="SIMULATED DEMO DATA")
    sample_size = Column(Integer, nullable=False, default=1)
    note = Column(String(255), nullable=True)

    locality = relationship("Locality", back_populates="demand_signals")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="user")  # "admin" or "user"
    share_contact_consent = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    favorites = relationship("UserFavorite", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("NotificationLog", back_populates="user")


class UserFavorite(Base):
    __tablename__ = "user_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="favorites")
    property = relationship("Property", back_populates="favorites")

    __table_args__ = (
        Index("idx_user_prop_fav", "user_id", "property_id", unique=True),
    )


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    owner_email = Column(String(120), nullable=False)
    owner_name = Column(String(100), nullable=False)
    user_name = Column(String(100), nullable=False)
    user_email = Column(String(120), nullable=False)
    user_phone = Column(String(30), nullable=True)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(50), nullable=False, default="sent")

    user = relationship("User", back_populates="notifications")
    property = relationship("Property", back_populates="notifications")

