import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Locality Schemas
class LocalityBase(BaseModel):
    name: str
    city: str = "Hyderabad"
    state: str = "Telangana"
    latitude: float
    longitude: float

class LocalityOut(LocalityBase):
    id: int
    property_count: Optional[int] = 0

    class Config:
        orm_mode = True

# Property Schemas
class PropertyBase(BaseModel):
    title: str
    locality_id: int
    property_type: str  # apartment, villa, independent house, plot
    listing_type: str   # sale, rent
    price: float
    area_sqft: float
    bedrooms: Optional[int] = None
    listing_date: datetime.date
    status: str = "active"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_approximate_coords: bool = False
    source: str = "PropScope Internal"
    source_url: Optional[str] = None
    verification_status: str = "Verified"
    image_url: Optional[str] = None
    age: Optional[float] = 2.0
    is_suspicious: bool = False
    suspicious_reason: Optional[str] = None
    address: Optional[str] = None
    owner_name: Optional[str] = "PropScope Partner"
    owner_email: Optional[str] = "owner@realestateiq.com"
    owner_phone: Optional[str] = "+91 98765 43210"
    is_available: bool = True
    amenities: Optional[str] = "Gym, Swimming Pool, Clubhouse, 24/7 Security"

class PropertyCreate(PropertyBase):
    external_id: Optional[str] = None

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    locality_id: Optional[int] = None
    property_type: Optional[str] = None
    listing_type: Optional[str] = None
    price: Optional[float] = None
    area_sqft: Optional[float] = None
    bedrooms: Optional[int] = None
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    image_url: Optional[str] = None
    age: Optional[float] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    is_available: Optional[bool] = None
    amenities: Optional[str] = None

class PropertyOut(PropertyBase):
    id: int
    external_id: Optional[str] = None
    locality_name: Optional[str] = None
    city: Optional[str] = None
    price_per_sqft: float
    created_at: Optional[datetime.datetime] = None

    class Config:
        orm_mode = True

class PropertyListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    properties: List[PropertyOut]

# Market Metrics
class MarketSummaryResponse(BaseModel):
    locality_id: Optional[int] = None
    locality_name: str
    city: str
    listing_type: str
    property_type: str
    active_listings: int
    average_asking_price: float
    median_asking_price: float
    median_price_per_sqft: float
    new_listings_30d: int
    price_change_pct: Optional[float] = None
    price_change_period: str = "Previous Quarter"
    demand_score: Optional[float] = None
    demand_status: str
    sample_size: int
    is_simulated: bool = True
    data_disclaimer: str

class PropertyTypeDistribution(BaseModel):
    property_type: str
    count: int
    percentage: float

class PriceRangeDistribution(BaseModel):
    price_range: str
    count: int
    percentage: float

class SupplyAnalysisResponse(BaseModel):
    locality_id: Optional[int] = None
    locality_name: str
    listing_type: str
    active_listings: int
    new_listings_30d: int
    listings_change_pct: Optional[float] = None
    property_type_distribution: List[PropertyTypeDistribution]
    price_range_distribution: List[PriceRangeDistribution]
    sample_size: int

class ContributingSignal(BaseModel):
    signal_type: str
    raw_value: float
    weight: float
    normalized_score: float
    sample_size: int
    source: str

class DemandAnalysisResponse(BaseModel):
    locality_id: Optional[int] = None
    locality_name: str
    has_sufficient_data: bool
    demand_score: Optional[float] = None  # 0 to 100
    score_classification: Optional[str] = None  # High, Moderate, Low, or None
    contributing_signals: List[ContributingSignal] = []
    methodology_explanation: str
    total_sample_size: int
    data_period: str
    status_message: str

class TrendDataPoint(BaseModel):
    observation_date: str
    period_label: str
    average_asking_price: float
    median_asking_price: float
    median_price_per_sqft: float
    active_listing_count: int
    new_listing_count: int
    sample_size: int

class MarketTrendsResponse(BaseModel):
    locality_id: Optional[int] = None
    locality_name: str
    listing_type: str
    property_type: str
    data_points: List[TrendDataPoint]
    overall_price_change_pct: Optional[float] = None
    has_sufficient_history: bool
    message: Optional[str] = None

class LocalityComparisonItem(BaseModel):
    locality_id: int
    locality_name: str
    city: str
    listing_type: str
    property_type: str
    median_asking_price: float
    average_asking_price: float
    median_price_per_sqft: float
    active_listing_count: int
    new_listing_count_30d: int
    price_change_pct: Optional[float] = None
    demand_score: Optional[float] = None
    demand_status: str
    sample_size: int
    data_freshness: str

class MarketCompareResponse(BaseModel):
    listing_type: str
    property_type: str
    localities: List[LocalityComparisonItem]
    comparison_notes: str

class ImportSummaryResponse(BaseModel):
    total_rows: int
    successful_rows: int
    rejected_rows: int
    duplicate_rows: int
    errors: List[str]
    message: str

# Auth & User Schemas
class UserRegisterRequest(BaseModel):
    email: str
    name: str
    password: str
    phone: Optional[str] = None
    role: str = "user"  # "admin" or "user"
    share_contact_consent: bool = True

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    phone: Optional[str] = None
    role: str
    share_contact_consent: bool
    created_at: Optional[datetime.datetime] = None

    class Config:
        orm_mode = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# Favorite & Notification Schemas
class FavoriteOut(BaseModel):
    id: int
    property_id: int
    created_at: datetime.datetime
    property: PropertyOut

    class Config:
        orm_mode = True

class FavoriteActionResponse(BaseModel):
    success: bool
    message: str
    property_id: int
    is_favorited: bool
    notification_sent: bool
    owner_notified: Optional[str] = None

class SendTestEmailRequest(BaseModel):
    target_email: str
    property_id: Optional[int] = None

class SmtpSettingsOut(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_from: str
    smtp_use_tls: bool
    is_configured: bool

class SmtpSettingsUpdate(BaseModel):
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    smtp_from: Optional[str] = None
    smtp_use_tls: bool = True

class NotificationLogOut(BaseModel):
    id: int
    property_id: int
    owner_email: str
    owner_name: str
    user_name: str
    user_email: str
    user_phone: Optional[str] = None
    subject: str
    message: str
    sent_at: datetime.datetime
    status: str

    class Config:
        orm_mode = True

# Apify Live Scraper Schemas
class ApifySyncRequest(BaseModel):
    actor_id: Optional[str] = None
    dataset_id: Optional[str] = None
    locality_name: Optional[str] = None
    limit: Optional[int] = 20

class ApifySyncResponse(BaseModel):
    status: str
    source: str
    records_fetched: int
    records_imported: int
    records_updated: int
    message: str

