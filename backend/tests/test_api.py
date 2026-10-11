import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.seed_data import init_seed_data

from sqlalchemy.pool import StaticPool

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from backend.app.auth import init_default_users

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    init_seed_data(db, force=True)
    init_default_users(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["localities_count"] >= 5
    assert data["properties_count"] > 0

def test_localities_endpoint():
    response = client.get("/api/localities")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5
    names = [loc["name"] for loc in data]
    assert "Miyapur" in names
    assert "Gachibowli" in names
    assert "Kukatpally" in names

def test_properties_filtering():
    # Filter by locality Miyapur and sale
    resp = client.get("/api/properties?locality_name=Miyapur&listing_type=sale")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] > 0
    for prop in data["properties"]:
        assert prop["locality_name"] == "Miyapur"
        assert prop["listing_type"] == "sale"
        assert prop["price_per_sqft"] > 0

def test_market_summary_sale_vs_rent_separation():
    # Check sale summary
    sale_resp = client.get("/api/market/summary?locality_name=Gachibowli&listing_type=sale")
    assert sale_resp.status_code == 200
    sale_data = sale_resp.json()
    assert sale_data["median_asking_price"] > 1_000_000  # Multi-lakh or crore for sale
    assert sale_data["listing_type"] == "sale"

    # Check rent summary
    rent_resp = client.get("/api/market/summary?locality_name=Gachibowli&listing_type=rent")
    assert rent_resp.status_code == 200
    rent_data = rent_resp.json()
    assert rent_data["median_asking_price"] < 500_000   # Monthly rent range
    assert rent_data["listing_type"] == "rent"
    assert rent_data["median_asking_price"] != sale_data["median_asking_price"]

def test_market_demand_insufficient_data():
    # Locality without demand signals must return Insufficient demand data
    resp = client.get("/api/market/demand?locality_id=999")
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_sufficient_data"] is False
    assert data["demand_score"] is None
    assert "Insufficient demand data" in data["status_message"]

def test_market_demand_demo_disclosure():
    # Verified demo signals from CSV dataset
    resp = client.get("/api/market/demand?locality_name=Miyapur")
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_sufficient_data"] is True
    assert data["demand_score"] is not None
    assert "Demo" in data["score_classification"]
    assert "NOT actual buyer demand" in data["methodology_explanation"]

def test_market_trends_endpoint():
    resp = client.get("/api/market/trends?locality_name=Gachibowli&listing_type=sale")
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_sufficient_history"] is True
    assert len(data["data_points"]) >= 6

def test_market_compare_endpoint():
    locs = client.get("/api/localities").json()
    id1, id2 = locs[0]["id"], locs[1]["id"]
    resp = client.get(f"/api/market/compare?locality_ids={id1},{id2}&listing_type=sale")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["localities"]) == 2
