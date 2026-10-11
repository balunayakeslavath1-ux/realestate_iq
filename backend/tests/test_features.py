import pytest
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.models import Property, Locality, User, UserFavorite, NotificationLog

from backend.app.database import get_db
from backend.app.auth import init_default_users

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def ensure_default_users():
    get_db_func = app.dependency_overrides.get(get_db, get_db)
    db_gen = get_db_func()
    db = next(db_gen) if hasattr(db_gen, "__next__") else db_gen
    try:
        init_default_users(db)
    finally:
        if hasattr(db, "close"):
            db.close()


def test_admin_and_user_login():
    # Admin login
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@realestateiq.com",
        "password": "admin123"
    })
    assert admin_res.status_code == 200
    data = admin_res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

    # User login
    user_res = client.post("/api/auth/login", json={
        "email": "user@realestateiq.com",
        "password": "user123"
    })
    assert user_res.status_code == 200
    u_data = user_res.json()
    assert "access_token" in u_data
    assert u_data["user"]["role"] == "user"

def test_user_registration_and_auth_profile():
    import uuid
    unique_email = f"buyer_{uuid.uuid4().hex[:6]}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "email": unique_email,
        "name": "Priya Reddy",
        "password": "password123",
        "phone": "+91 98888 77777",
        "share_contact_consent": True
    })
    assert reg_res.status_code == 200
    data = reg_res.json()
    token = data["access_token"]

    # Access /me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == unique_email
    assert me_res.json()["name"] == "Priya Reddy"

def test_admin_property_crud_workflow():
    # 1. Login as Admin
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@realestateiq.com",
        "password": "admin123"
    })
    admin_token = admin_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Create Property
    create_res = client.post("/api/properties", headers=headers, json={
        "title": "Aparna Serene Park Luxury 3BHK",
        "locality_id": 1,
        "property_type": "apartment",
        "listing_type": "sale",
        "price": 17500000.0,
        "area_sqft": 1850.0,
        "bedrooms": 3,
        "listing_date": "2026-10-10",
        "address": "Aparna Serene Park, Near Botanical Garden, Gachibowli",
        "owner_name": "Aparna Realty Solutions",
        "owner_email": "sales@aparnarealty.test",
        "owner_phone": "+91 94444 33333",
        "is_available": True,
        "amenities": "Swimming Pool, Gymnasium, Tennis Court"
    })
    assert create_res.status_code == 200
    prop_data = create_res.json()
    prop_id = prop_data["id"]
    assert prop_data["title"] == "Aparna Serene Park Luxury 3BHK"
    assert prop_data["owner_email"] == "sales@aparnarealty.test"
    assert prop_data["price"] == 17500000.0

    # 3. Update Property
    update_res = client.put(f"/api/properties/{prop_id}", headers=headers, json={
        "price": 18000000.0,
        "bedrooms": 3
    })
    assert update_res.status_code == 200
    assert update_res.json()["price"] == 18000000.0

    # 4. Toggle Status
    toggle_res = client.patch(f"/api/properties/{prop_id}/toggle-status", headers=headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["status"] == "inactive"
    assert toggle_res.json()["is_available"] is False

    # 5. Delete Property
    del_res = client.delete(f"/api/properties/{prop_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

def test_save_favorite_and_owner_notification():
    # 1. Login as User
    user_res = client.post("/api/auth/login", json={
        "email": "user@realestateiq.com",
        "password": "user123"
    })
    user_token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {user_token}"}

    # Fetch any existing property ID
    props_res = client.get("/api/properties?page_size=1")
    assert props_res.status_code == 200
    prop_id = props_res.json()["properties"][0]["id"]

    # 2. Save to favorites (Triggers owner notification)
    fav_res = client.post(f"/api/favorites/{prop_id}", headers=headers)
    assert fav_res.status_code == 200
    fav_data = fav_res.json()
    assert fav_data["success"] is True
    assert fav_data["is_favorited"] is True
    assert fav_data["notification_sent"] is True
    assert fav_data["owner_notified"] is not None

    # 3. Check Favorites list
    my_favs = client.get("/api/favorites", headers=headers)
    assert my_favs.status_code == 200
    fav_ids = [f["property_id"] for f in my_favs.json()]
    assert prop_id in fav_ids

    # 4. Check Notification Log
    notifs = client.get("/api/favorites/notifications", headers=headers)
    assert notifs.status_code == 200
    assert len(notifs.json()) > 0
    assert any(n["property_id"] == prop_id for n in notifs.json())
    prev_count = len(notifs.json())

    # 4b. Re-favoriting while already favorited should still re-dispatch notification and append to log
    refav_res = client.post(f"/api/favorites/{prop_id}", headers=headers)
    assert refav_res.status_code == 200
    assert refav_res.json()["notification_sent"] is True
    notifs_after = client.get("/api/favorites/notifications", headers=headers)
    assert len(notifs_after.json()) == prev_count + 1

    # 5. Remove from favorites
    rem_res = client.delete(f"/api/favorites/{prop_id}", headers=headers)
    assert rem_res.status_code == 200
    assert rem_res.json()["is_favorited"] is False

def test_smtp_settings_and_test_email_dispatch():
    # Admin login
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@realestateiq.com",
        "password": "admin123"
    })
    admin_token = admin_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Get SMTP settings
    get_res = client.get("/api/favorites/smtp-settings", headers=headers)
    assert get_res.status_code == 200
    smtp_data = get_res.json()
    assert "smtp_host" in smtp_data
    assert "is_configured" in smtp_data

    # 2. Update SMTP settings
    update_res = client.post("/api/favorites/smtp-settings", headers=headers, json={
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": "test_sender@gmail.com",
        "smtp_password": "abcd efgh ijkl mnop",
        "smtp_from": "alerts@realestateiq.com",
        "smtp_use_tls": True
    })
    assert update_res.status_code == 200
    assert update_res.json()["smtp_user"] == "test_sender@gmail.com"
    assert update_res.json()["is_configured"] is True

    # 3. Dispatch test email to phone
    test_res = client.post("/api/favorites/send-test-email", headers=headers, json={
        "target_email": "rahulphotos806@gmail.com"
    })
    assert test_res.status_code == 200
    assert test_res.json()["target_email"] == "rahulphotos806@gmail.com"
    assert "delivery_result" in test_res.json()

def test_apify_sync_live_feed():
    sync_res = client.post("/api/import/apify-sync", json={"limit": 5})
    assert sync_res.status_code == 200
    data = sync_res.json()
    assert data["status"] == "success"
    assert data["records_fetched"] > 0
    assert (data["records_imported"] + data["records_updated"]) > 0
