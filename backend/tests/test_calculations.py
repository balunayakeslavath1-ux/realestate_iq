import pytest
import datetime
from backend.app.models import Property, DemandSignal
from backend.app.calculations import (
    calculate_property_metrics,
    calculate_safe_percentage_change,
    calculate_supply_distribution,
    evaluate_demand_score
)

def test_calculate_property_metrics_empty():
    res = calculate_property_metrics([])
    assert res["active_listings"] == 0
    assert res["average_asking_price"] == 0.0
    assert res["median_asking_price"] == 0.0
    assert res["median_price_per_sqft"] == 0.0

def test_calculate_property_metrics_values():
    p1 = Property(
        id=1, title="Test 1", locality_id=1, property_type="apartment",
        listing_type="sale", price=10_000_000, area_sqft=1000,
        listing_date=datetime.date.today()
    )
    p2 = Property(
        id=2, title="Test 2", locality_id=1, property_type="apartment",
        listing_type="sale", price=20_000_000, area_sqft=2000,
        listing_date=datetime.date.today() - datetime.timedelta(days=10)
    )
    p3 = Property(
        id=3, title="Test 3", locality_id=1, property_type="apartment",
        listing_type="sale", price=30_000_000, area_sqft=2000,
        listing_date=datetime.date.today() - datetime.timedelta(days=45)
    )

    res = calculate_property_metrics([p1, p2, p3])
    assert res["active_listings"] == 3
    assert res["average_asking_price"] == 20_000_000.0
    assert res["median_asking_price"] == 20_000_000.0
    # price/sqft: 10000, 10000, 15000 -> median is 10000
    assert res["median_price_per_sqft"] == 10000.0
    # p1 and p2 are within 30 days, p3 is 45 days ago
    assert res["new_listings_30d"] == 2

def test_calculate_safe_percentage_change():
    assert calculate_safe_percentage_change(120, 100) == 20.0
    assert calculate_safe_percentage_change(80, 100) == -20.0
    assert calculate_safe_percentage_change(100, 0) is None
    assert calculate_safe_percentage_change(100, None) is None

def test_calculate_supply_distribution():
    p1 = Property(title="A", locality_id=1, property_type="apartment", listing_type="sale", price=6_000_000, area_sqft=1000)
    p2 = Property(title="B", locality_id=1, property_type="villa", listing_type="sale", price=25_000_000, area_sqft=3000)
    dist = calculate_supply_distribution([p1, p2], "sale")
    assert len(dist["by_property_type"]) == 2
    assert len(dist["by_price_range"]) == 4

def test_evaluate_demand_score_insufficient():
    # Only 1 signal with small sample size
    sig = DemandSignal(
        locality_id=1,
        observation_date=datetime.date.today(),
        signal_type="buyer_inquiries",
        signal_value=50.0,
        source="Test",
        sample_size=5
    )
    res = evaluate_demand_score([sig])
    assert res["has_sufficient_data"] is False
    assert res["demand_score"] is None
    assert res["status_message"] == "Insufficient demand data"

def test_evaluate_demand_score_sufficient():
    # 2 signals with >= 15 sample size
    s1 = DemandSignal(
        locality_id=1,
        observation_date=datetime.date.today(),
        signal_type="buyer_inquiries",
        signal_value=80.0,
        source="Test",
        sample_size=10
    )
    s2 = DemandSignal(
        locality_id=1,
        observation_date=datetime.date.today(),
        signal_type="search_engagement",
        signal_value=90.0,
        source="Test",
        sample_size=15
    )
    res = evaluate_demand_score([s1, s2])
    assert res["has_sufficient_data"] is True
    assert res["demand_score"] is not None
    assert 80.0 <= res["demand_score"] <= 90.0
