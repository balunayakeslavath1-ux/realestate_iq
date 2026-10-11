import os
import csv
import datetime
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session
from backend.app.models import Locality, Property, MarketSnapshot, DemandSignal

DATASET_DIR = Path(__file__).resolve().parent.parent / "sample_data"

def load_demo_csv_dataset(db: Session, force: bool = False, dataset_dir: Optional[Path] = None) -> bool:
    """
    Loads the official PropScope Hyderabad CSV dataset into the SQLite database.
    Order:
      1. localities.csv
      2. properties.csv
      3. market_snapshots.csv
      4. demand_signals.csv
    Handles duplicate records, type casting, missing values safely.
    """
    dir_path = dataset_dir or DATASET_DIR
    localities_file = dir_path / "localities.csv"
    properties_file = dir_path / "properties.csv"
    snapshots_file = dir_path / "market_snapshots.csv"
    demand_file = dir_path / "demand_signals.csv"

    if not localities_file.exists():
        print(f"Dataset directory not found at {dir_path}, using fallback.")
        return False

    if force:
        db.query(DemandSignal).delete()
        db.query(MarketSnapshot).delete()
        db.query(Property).delete()
        db.query(Locality).delete()
        db.commit()

    # 1. Load Localities
    loc_id_map = {}
    with open(localities_file, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            csv_loc_id = int(row["locality_id"])
            name = row["name"].strip()
            
            existing = db.query(Locality).filter(Locality.name == name).first()
            if not existing:
                loc = Locality(
                    id=csv_loc_id,
                    name=name,
                    city=row.get("city", "Hyderabad").strip(),
                    state=row.get("state", "Telangana").strip(),
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    data_status=row.get("data_status", "SIMULATED DEMO").strip()
                )
                db.add(loc)
                db.flush()
                loc_id_map[csv_loc_id] = loc.id
            else:
                loc_id_map[csv_loc_id] = existing.id
    db.commit()

    # 2. Load Properties
    existing_ext_ids = set(
        p[0] for p in db.query(Property.external_id).filter(Property.external_id.isnot(None)).all()
    )
    with open(properties_file, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ext_id = row["property_id"].strip()
            if ext_id in existing_ext_ids:
                continue

            csv_loc_id = int(row["locality_id"])
            loc_db_id = loc_id_map.get(csv_loc_id, csv_loc_id)

            # Bedrooms casting
            beds_raw = row.get("bedrooms", "")
            bedrooms = None
            if beds_raw and beds_raw.strip():
                try:
                    bedrooms = int(float(beds_raw.strip()))
                except ValueError:
                    bedrooms = None

            # Date parsing
            date_raw = row.get("listing_date", "").strip()
            try:
                list_date = datetime.date.fromisoformat(date_raw)
            except ValueError:
                list_date = datetime.date.today()

            # Coordinates
            lat = float(row["latitude"]) if row.get("latitude") and row["latitude"].strip() else None
            lng = float(row["longitude"]) if row.get("longitude") and row["longitude"].strip() else None

            # Property type normalization: independent_house -> independent house
            p_type = row.get("property_type", "apartment").strip().replace("_", " ")

            age_raw = row.get("age", "")
            age_val = float(age_raw.strip()) if age_raw and age_raw.strip() else 2.5

            prop = Property(
                external_id=ext_id,
                title=row.get("title", "").strip(),
                locality_id=loc_db_id,
                property_type=p_type,
                listing_type=row.get("listing_type", "sale").strip().lower(),
                price=float(row["price_inr"]),
                area_sqft=float(row["area_sqft"]),
                bedrooms=bedrooms,
                listing_date=list_date,
                status=row.get("status", "active").strip().lower(),
                latitude=lat,
                longitude=lng,
                is_approximate_coords=False,
                source=row.get("source", "Synthetic demo dataset").strip(),
                verification_status=row.get("verification_status", "SIMULATED — NOT A REAL LISTING").strip(),
                price_unit_note=row.get("price_unit_note", "").strip(),
                currency=row.get("currency", "INR").strip(),
                age=age_val,
                image_url="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80"
            )
            db.add(prop)
            existing_ext_ids.add(ext_id)
    db.commit()

    # 3. Load Market Snapshots
    with open(snapshots_file, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            csv_loc_id = int(row["locality_id"])
            loc_db_id = loc_id_map.get(csv_loc_id, csv_loc_id)
            obs_date = datetime.date.fromisoformat(row["observation_date"].strip())
            l_type = row.get("listing_type", "sale").strip().lower()
            p_type = row.get("property_type", "apartment").strip().replace("_", " ")

            # Avoid duplicates
            existing_snap = db.query(MarketSnapshot).filter(
                MarketSnapshot.locality_id == loc_db_id,
                MarketSnapshot.observation_date == obs_date,
                MarketSnapshot.listing_type == l_type,
                MarketSnapshot.property_type == p_type
            ).first()

            if not existing_snap:
                snap = MarketSnapshot(
                    locality_id=loc_db_id,
                    observation_date=obs_date,
                    property_type=p_type,
                    listing_type=l_type,
                    active_listing_count=int(float(row.get("active_listing_count", 0))),
                    new_listing_count=int(float(row.get("new_listing_count", 0))),
                    average_asking_price=float(row.get("average_asking_price_inr", 0.0)),
                    median_asking_price=float(row.get("median_asking_price_inr", 0.0)),
                    median_price_per_sqft=float(row.get("median_price_per_sqft_inr", 0.0)),
                    sample_size=int(float(row.get("sample_size", 0))),
                    data_source=row.get("data_source", "SIMULATED DEMO DATA").strip()
                )
                db.add(snap)
    db.commit()

    # 4. Load Demand Signals
    with open(demand_file, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            csv_loc_id = int(row["locality_id"])
            loc_db_id = loc_id_map.get(csv_loc_id, csv_loc_id)
            obs_date = datetime.date.fromisoformat(row["observation_date"].strip())
            sig_type = row.get("signal_type", "demo_listing_engagement_index").strip()

            existing_sig = db.query(DemandSignal).filter(
                DemandSignal.locality_id == loc_db_id,
                DemandSignal.observation_date == obs_date,
                DemandSignal.signal_type == sig_type
            ).first()

            if not existing_sig:
                sig = DemandSignal(
                    locality_id=loc_db_id,
                    observation_date=obs_date,
                    signal_type=sig_type,
                    signal_value=float(row["signal_value"]),
                    source=row.get("source", "SIMULATED DEMO DATA").strip(),
                    sample_size=int(float(row.get("sample_size", 1))),
                    note=row.get("note", "").strip()
                )
                db.add(sig)
    db.commit()
    print("Successfully imported official PropScope Hyderabad CSV dataset.")
    return True

def init_seed_data(db: Session, force: bool = False):
    """
    Seeds database from the official CSV dataset if available.
    """
    loc_count = db.query(Locality).count()
    if loc_count > 0 and not force:
        return

    # First attempt: load the official CSV dataset
    loaded = load_demo_csv_dataset(db, force=force)
    if not loaded:
        print("Warning: CSV files could not be loaded.")
