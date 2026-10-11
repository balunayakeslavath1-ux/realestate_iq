import datetime
from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

class QualityAgent:
    """
    Step 2 — Quality Agent
    Removes duplicate records, flags missing information, and identifies
    unusual/suspicious prices for review using Isolation Forest and statistical bounds.
    """

    def __init__(self, contamination: float = 0.08):
        self.contamination = contamination

    def execute(self, raw_properties: List[Dict[str, Any]]) -> Dict[str, Any]:
        start_time = datetime.datetime.now()
        total_input = len(raw_properties)

        if not raw_properties:
            return {
                "status": "warning",
                "agent": "Quality Agent",
                "step": 2,
                "duration_ms": 0,
                "summary": "No properties received to clean.",
                "clean_properties": [],
                "flagged_properties": [],
                "metrics": {
                    "total_received": 0,
                    "duplicates_removed": 0,
                    "missing_info_count": 0,
                    "suspicious_price_count": 0,
                    "clean_records_count": 0,
                    "data_quality_score": 100.0,
                }
            }

        df = pd.DataFrame(raw_properties)

        # 1. Deduplication Check
        # Check duplicate titles + locality_id + price + area_sqft
        initial_len = len(df)
        df["dedup_key"] = (
            df["title"].astype(str).str.lower().str.strip() + "_" +
            df["locality_id"].astype(str) + "_" +
            df["price"].astype(str) + "_" +
            df["area_sqft"].astype(str)
        )
        duplicate_mask = df.duplicated(subset=["dedup_key"], keep="first")
        duplicates_removed = int(duplicate_mask.sum())
        
        # Keep non-duplicates
        df_unique = df[~duplicate_mask].copy().reset_index(drop=True)

        # 2. Missing Information Flags
        missing_flags = []
        for idx, row in df_unique.iterrows():
            reasons = []
            if pd.isna(row.get("bedrooms")) and row.get("property_type") not in ("plot", "commercial"):
                reasons.append("Missing bedrooms count")
            if pd.isna(row.get("latitude")) or pd.isna(row.get("longitude")):
                reasons.append("Missing geocoordinates")
            if pd.isna(row.get("area_sqft")) or row.get("area_sqft", 0) <= 0:
                reasons.append("Invalid or missing area_sqft")
            if pd.isna(row.get("price")) or row.get("price", 0) <= 0:
                reasons.append("Invalid or missing price")
            if reasons:
                missing_flags.append({
                    "id": row.get("id"),
                    "external_id": row.get("external_id"),
                    "title": row.get("title"),
                    "reasons": reasons
                })

        # 3. Isolation Forest for Suspicious Price / Anomaly Detection
        # Only run on sale listings with valid positive price and area
        sale_mask = (df_unique["listing_type"] == "sale") & (df_unique["price"] > 0) & (df_unique["area_sqft"] > 0)
        sale_df = df_unique[sale_mask].copy()

        suspicious_records = []
        if len(sale_df) >= 8:
            # Features for isolation forest: log(price), log(area_sqft), price_per_sqft
            features = np.column_stack([
                np.log1p(sale_df["price"].values),
                np.log1p(sale_df["area_sqft"].values),
                sale_df["price_per_sqft"].values
            ])

            iso_forest = IsolationForest(
                n_estimators=100,
                contamination=self.contamination,
                random_state=42
            )
            predictions = iso_forest.fit_predict(features) # -1 is anomaly, 1 is normal
            
            # Statistical boundaries (IQR on price_per_sqft)
            q25 = sale_df["price_per_sqft"].quantile(0.25)
            q75 = sale_df["price_per_sqft"].quantile(0.75)
            iqr = q75 - q25
            lower_bound = max(1000.0, q25 - 1.5 * iqr)
            upper_bound = q75 + 2.5 * iqr

            for (idx, row), pred in zip(sale_df.iterrows(), predictions):
                pp_sqft = row["price_per_sqft"]
                price = row["price"]
                
                is_anomaly = False
                reasons = []
                if pred == -1:
                    is_anomaly = True
                    reasons.append("Isolation Forest detected multi-feature outlier")
                if pp_sqft < lower_bound:
                    is_anomaly = True
                    reasons.append(f"Price/sqft ₹{pp_sqft:,.0f} abnormally low (threshold: ₹{lower_bound:,.0f})")
                if pp_sqft > upper_bound or price > 800_000_000:
                    is_anomaly = True
                    reasons.append(f"Price/sqft ₹{pp_sqft:,.0f} abnormally high (threshold: ₹{upper_bound:,.0f})")

                if is_anomaly:
                    suspicious_records.append({
                        "id": row.get("id"),
                        "external_id": row.get("external_id"),
                        "title": row.get("title"),
                        "locality_name": row.get("locality_name"),
                        "price": row.get("price"),
                        "price_per_sqft": pp_sqft,
                        "area_sqft": row.get("area_sqft"),
                        "reasons": reasons
                    })

        suspicious_ids = {r["id"] for r in suspicious_records}

        # 4. Prepare Clean Properties for Downstream ML Models
        # Filter out extreme anomalies and unworkable records from training
        clean_df = df_unique[~df_unique["id"].isin(suspicious_ids)].copy()
        # Impute missing bedrooms with median of property type
        if "bedrooms" in clean_df.columns:
            median_beds = clean_df["bedrooms"].median() or 3.0
            clean_df["bedrooms"] = clean_df["bedrooms"].fillna(median_beds)

        clean_properties = clean_df.drop(columns=["dedup_key"]).to_dict(orient="records")

        # Compute Quality Score (0 to 100%)
        faulty_count = duplicates_removed + len(missing_flags) + len(suspicious_records)
        quality_score = round(max(50.0, 100.0 - (faulty_count / max(1, total_input)) * 100.0), 1)

        duration_ms = round((datetime.datetime.now() - start_time).total_seconds() * 1000, 2)

        return {
            "status": "success",
            "agent": "Quality Agent",
            "step": 2,
            "duration_ms": duration_ms,
            "summary": (
                f"Removed {duplicates_removed} duplicate records, flagged {len(missing_flags)} listings with missing data, "
                f"and identified {len(suspicious_records)} suspicious prices via Isolation Forest. "
                f"Dataset health: {quality_score}%."
            ),
            "clean_properties": clean_properties,
            "flagged_properties": suspicious_records,
            "missing_info_records": missing_flags,
            "metrics": {
                "total_received": total_input,
                "duplicates_removed": duplicates_removed,
                "missing_info_count": len(missing_flags),
                "suspicious_price_count": len(suspicious_records),
                "clean_records_count": len(clean_properties),
                "data_quality_score": quality_score,
                "model_used": "Isolation Forest (scikit-learn) + IQR Bounds"
            }
        }
