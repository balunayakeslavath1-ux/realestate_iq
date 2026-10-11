import io
import csv
import datetime
from typing import Dict, Any, List, Optional
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.models import Property, Locality, MarketSnapshot

PROPERTY_CSV_COLUMNS = [
    "title", "locality_name", "property_type", "listing_type",
    "price", "area_sqft", "bedrooms", "listing_date", "external_id",
    "latitude", "longitude", "verification_status", "source"
]

PROPERTY_SAMPLE_CSV = """title,locality_name,property_type,listing_type,price,area_sqft,bedrooms,listing_date,external_id,latitude,longitude,verification_status,source
Sunny 3BHK Apartment in Miyapur,Miyapur,apartment,sale,8500000,1650,3,2025-09-15,PROP-IMP-001,17.4981,78.3625,Verified,CSV Upload
Spacious 2BHK Near Hitec City Road,Kondapur,apartment,rent,34000,1250,2,2025-09-18,PROP-IMP-002,17.4710,78.3582,Agent Posted,CSV Upload
Luxury 4BHK Villa with Private Garden,Gachibowli,villa,sale,32000000,3400,4,2025-09-20,PROP-IMP-003,17.4420,78.3510,Verified,CSV Upload
"""

def generate_csv_template() -> str:
    """Returns a CSV string template for property imports."""
    return PROPERTY_SAMPLE_CSV

def import_properties_from_csv(file_content: bytes, db: Session) -> Dict[str, Any]:
    """
    Parses and validates CSV rows for property listings.
    Prevents duplicates, validates data types and ranges, logs failures.
    """
    total_rows = 0
    successful_rows = 0
    rejected_rows = 0
    duplicate_rows = 0
    errors: List[str] = []

    try:
        decoded = file_content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            decoded = file_content.decode("latin-1")
        except Exception as e:
            return {
                "total_rows": 0,
                "successful_rows": 0,
                "rejected_rows": 0,
                "duplicate_rows": 0,
                "errors": [f"File decoding error: {str(e)}"],
                "message": "Failed to decode CSV file."
            }

    csv_reader = csv.DictReader(io.StringIO(decoded))
    if not csv_reader.fieldnames:
        return {
            "total_rows": 0,
            "successful_rows": 0,
            "rejected_rows": 0,
            "duplicate_rows": 0,
            "errors": ["CSV file is empty or missing headers."],
            "message": "Empty file."
        }

    # Normalize header names
    field_map = {f.strip().lower(): f for f in csv_reader.fieldnames}
    required_fields = ["title", "locality_name", "property_type", "listing_type", "price", "area_sqft"]
    for req in required_fields:
        if req not in field_map:
            return {
                "total_rows": 0,
                "successful_rows": 0,
                "rejected_rows": 0,
                "duplicate_rows": 0,
                "errors": [f"Missing required CSV column header: '{req}'"],
                "message": "Validation failed on headers."
            }

    # Pre-cache localities
    localities = {loc.name.lower(): loc for loc in db.query(Locality).all()}
    existing_external_ids = set(
        res[0] for res in db.query(Property.external_id).filter(Property.external_id.isnot(None)).all()
    )

    valid_property_types = {"apartment", "villa", "independent house", "plot"}
    valid_listing_types = {"sale", "rent"}

    to_insert: List[Property] = []

    for row_idx, row in enumerate(csv_reader, start=2): # line 2 is row 1 after header
        total_rows += 1
        row_errors = []

        # 1. Title
        title = (row.get(field_map.get("title", "")) or "").strip()
        if not title:
            row_errors.append("Title cannot be blank")

        # 2. Locality lookup
        loc_name = (row.get(field_map.get("locality_name", "")) or "").strip()
        loc = localities.get(loc_name.lower())
        if not loc:
            row_errors.append(f"Locality '{loc_name}' not found. Available: {', '.join(l.title() for l in localities.keys())}")

        # 3. Property Type
        prop_type = (row.get(field_map.get("property_type", "")) or "").strip().lower()
        if prop_type not in valid_property_types:
            row_errors.append(f"Invalid property_type '{prop_type}'. Allowed: apartment, villa, independent house, plot")

        # 4. Listing Type
        list_type = (row.get(field_map.get("listing_type", "")) or "").strip().lower()
        if list_type not in valid_listing_types:
            row_errors.append(f"Invalid listing_type '{list_type}'. Allowed: sale, rent")

        # 5. Price
        try:
            price_val = float(row.get(field_map.get("price", "0")) or 0)
            if price_val <= 0:
                row_errors.append("Price must be a positive number")
        except ValueError:
            row_errors.append("Price must be a valid numeric value")
            price_val = 0.0

        # 6. Area
        try:
            area_val = float(row.get(field_map.get("area_sqft", "0")) or 0)
            if area_val <= 0:
                row_errors.append("Area in sqft must be a positive number")
        except ValueError:
            row_errors.append("Area in sqft must be a valid numeric value")
            area_val = 0.0

        # 7. Bedrooms
        beds_raw = row.get(field_map.get("bedrooms", "")) if "bedrooms" in field_map else None
        beds_val = None
        if beds_raw and str(beds_raw).strip():
            try:
                beds_val = int(float(beds_raw))
                if beds_val < 0 or beds_val > 50:
                    row_errors.append("Bedrooms must be between 0 and 50")
            except ValueError:
                row_errors.append("Bedrooms must be an integer if provided")

        # 8. Listing Date
        date_raw = row.get(field_map.get("listing_date", "")) if "listing_date" in field_map else None
        list_date = datetime.date.today()
        if date_raw and str(date_raw).strip():
            try:
                list_date = datetime.date.fromisoformat(str(date_raw).strip())
            except ValueError:
                row_errors.append(f"Invalid listing_date '{date_raw}'. Expected YYYY-MM-DD")

        # 9. Lat/Lng
        lat_raw = row.get(field_map.get("latitude", "")) if "latitude" in field_map else None
        lng_raw = row.get(field_map.get("longitude", "")) if "longitude" in field_map else None
        lat_val = None
        lng_val = None
        if lat_raw and str(lat_raw).strip():
            try:
                lat_val = float(lat_raw)
                if not (-90.0 <= lat_val <= 90.0):
                    row_errors.append("Latitude must be between -90 and 90")
            except ValueError:
                row_errors.append("Latitude must be a valid number")
        if lng_raw and str(lng_raw).strip():
            try:
                lng_val = float(lng_raw)
                if not (-180.0 <= lng_val <= 180.0):
                    row_errors.append("Longitude must be between -180 and 180")
            except ValueError:
                row_errors.append("Longitude must be a valid number")

        # 10. External ID / Duplicate check
        ext_id = row.get(field_map.get("external_id", "")) if "external_id" in field_map else None
        if ext_id and str(ext_id).strip():
            ext_id = str(ext_id).strip()
            if ext_id in existing_external_ids:
                duplicate_rows += 1
                row_errors.append(f"Duplicate record with external_id '{ext_id}' already exists")

        # Fallback duplicate check: identical title + locality + price
        if not ext_id and loc:
            dup_check = db.query(Property).filter(
                Property.title == title,
                Property.locality_id == loc.id,
                Property.price == price_val
            ).first()
            if dup_check:
                duplicate_rows += 1
                row_errors.append(f"Duplicate record: identical property already exists in database")

        if row_errors:
            rejected_rows += 1
            errors.append(f"Row {row_idx}: " + "; ".join(row_errors))
            continue

        # If valid, prepare Property object
        prop_obj = Property(
            external_id=ext_id,
            title=title,
            locality_id=loc.id,
            property_type=prop_type,
            listing_type=list_type,
            price=price_val,
            area_sqft=area_val,
            bedrooms=beds_val,
            listing_date=list_date,
            status="active",
            latitude=lat_val,
            longitude=lng_val,
            is_approximate_coords=(lat_val is None or lng_val is None),
            source=row.get(field_map.get("source", "CSV Import")) or "CSV Import",
            verification_status=row.get(field_map.get("verification_status", "Unverified")) or "Unverified"
        )
        to_insert.append(prop_obj)
        if ext_id:
            existing_external_ids.add(ext_id)
        successful_rows += 1

    if to_insert:
        db.bulk_save_objects(to_insert)
        db.commit()

    return {
        "total_rows": total_rows,
        "successful_rows": successful_rows,
        "rejected_rows": rejected_rows,
        "duplicate_rows": duplicate_rows,
        "errors": errors[:50],  # Return up to 50 errors for readability
        "message": f"Processed {total_rows} rows: {successful_rows} imported successfully, {rejected_rows} rejected ({duplicate_rows} duplicates)."
    }
