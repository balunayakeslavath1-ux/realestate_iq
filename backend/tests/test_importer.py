import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base
from backend.app.models import Locality, Property
from backend.app.importer import import_properties_from_csv, generate_csv_template

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Insert test locality
    loc = Locality(name="Kondapur", city="Hyderabad", state="Telangana", latitude=17.4699, longitude=78.3578)
    db.add(loc)
    db.commit()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

def test_generate_csv_template():
    template = generate_csv_template()
    assert "title,locality_name,property_type" in template
    assert "Miyapur" in template

def test_import_valid_and_duplicate_csv(db_session):
    csv_data = """title,locality_name,property_type,listing_type,price,area_sqft,bedrooms,listing_date,external_id,latitude,longitude,verification_status,source
Kondapur Green Flat,Kondapur,apartment,sale,9000000,1400,3,2025-09-01,IMP-01,17.47,78.35,Verified,CSV
Kondapur Green Flat,Kondapur,apartment,sale,9000000,1400,3,2025-09-01,IMP-01,17.47,78.35,Verified,CSV
Invalid Locality Prop,UnknownPlace,apartment,sale,5000000,1000,2,2025-09-01,IMP-02,17.47,78.35,Verified,CSV
""".encode("utf-8")

    result = import_properties_from_csv(csv_data, db_session)
    assert result["total_rows"] == 3
    assert result["successful_rows"] == 1
    assert result["duplicate_rows"] == 1
    assert result["rejected_rows"] == 2
    assert len(result["errors"]) == 2

    # Verify property was inserted in DB
    prop = db_session.query(Property).filter(Property.external_id == "IMP-01").first()
    assert prop is not None
    assert prop.title == "Kondapur Green Flat"
