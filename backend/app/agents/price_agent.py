import datetime
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from catboost import CatBoostRegressor

class PriceAgent:
    """
    Step 3 — Price Agent
    Uses a trained CatBoost model as the primary property price valuation engine,
    benchmarks against Random Forest, and generates valuation predictions
    based on size, bedrooms, type, age and locality.
    """

    def __init__(self):
        self.catboost_model = None
        self.rf_pipeline = None
        self.metrics = {}
        self.feature_importances = {}
        self.is_trained = False
        self.training_summary = {}

    def train_and_benchmark(self, clean_properties: List[Dict[str, Any]]) -> Dict[str, Any]:
        start_time = datetime.datetime.now()

        # Filter only valid sale listings for price valuation
        sale_props = [
            p for p in clean_properties
            if p.get("listing_type", "sale") == "sale" and p.get("price", 0) > 0 and p.get("area_sqft", 0) > 0
        ]

        if len(sale_props) < 5:
            return {
                "status": "warning",
                "agent": "Price Agent",
                "step": 3,
                "duration_ms": 0,
                "summary": "Insufficient property records to train valuation models.",
                "models": {}
            }

        df = pd.DataFrame(sale_props)

        # Feature selection
        # Features: size (area_sqft), bedrooms, property_type, age, locality_name
        df["bedrooms"] = df["bedrooms"].fillna(2.0).astype(float)
        df["age"] = df["age"].fillna(2.5).astype(float)
        df["area_sqft"] = df["area_sqft"].astype(float)
        df["property_type"] = df["property_type"].astype(str)
        df["locality_name"] = df["locality_name"].astype(str)

        X = df[["area_sqft", "bedrooms", "age", "property_type", "locality_name"]]
        y = df["price"].astype(float)

        # Train / Test split (80/20) or cross-split
        test_size = 0.2 if len(df) >= 15 else 0.1
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

        # 1. CatBoost (Primary Model)
        cat_features = ["property_type", "locality_name"]
        cb_model = CatBoostRegressor(
            iterations=150,
            learning_rate=0.08,
            depth=5,
            cat_features=cat_features,
            verbose=0,
            random_seed=42
        )
        cb_model.fit(X_train, y_train, eval_set=(X_test, y_test), early_stopping_rounds=20, verbose=0)
        self.catboost_model = cb_model

        cb_preds = cb_model.predict(X_test)
        cb_mae = float(mean_absolute_error(y_test, cb_preds))
        cb_rmse = float(np.sqrt(mean_squared_error(y_test, cb_preds)))
        cb_r2 = float(r2_score(y_test, cb_preds))
        cb_mape = float(np.mean(np.abs((y_test - cb_preds) / y_test)) * 100.0)

        # 2. Random Forest (Benchmark Model)
        preprocessor = ColumnTransformer(
            transformers=[
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_features),
                ("num", "passthrough", ["area_sqft", "bedrooms", "age"])
            ]
        )
        rf = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
        rf_pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("regressor", rf)
        ])
        rf_pipeline.fit(X_train, y_train)
        self.rf_pipeline = rf_pipeline

        rf_preds = rf_pipeline.predict(X_test)
        rf_mae = float(mean_absolute_error(y_test, rf_preds))
        rf_rmse = float(np.sqrt(mean_squared_error(y_test, rf_preds)))
        rf_r2 = float(r2_score(y_test, rf_preds))
        rf_mape = float(np.mean(np.abs((y_test - rf_preds) / y_test)) * 100.0)

        # Feature Importances from CatBoost
        cb_importances = cb_model.get_feature_importance()
        feat_names = ["area_sqft", "bedrooms", "age", "property_type", "locality_name"]
        importance_dict = {
            f: round(float(imp), 2) for f, imp in sorted(zip(feat_names, cb_importances), key=lambda x: x[1], reverse=True)
        }

        self.is_trained = True
        self.metrics = {
            "catboost": {
                "name": "CatBoost (Primary)",
                "mae_inr": round(cb_mae, 2),
                "rmse_inr": round(cb_rmse, 2),
                "r2_score": round(max(0.0, cb_r2), 4),
                "mape_pct": round(cb_mape, 2),
            },
            "random_forest": {
                "name": "Random Forest (Benchmark)",
                "mae_inr": round(rf_mae, 2),
                "rmse_inr": round(rf_rmse, 2),
                "r2_score": round(max(0.0, rf_r2), 4),
                "mape_pct": round(rf_mape, 2),
            },
            "comparison": {
                "preferred_model": "CatBoost" if cb_r2 >= rf_r2 else "Random Forest",
                "catboost_r2_improvement": round((cb_r2 - rf_r2), 4),
                "catboost_mae_reduction_pct": round(((rf_mae - cb_mae) / max(1.0, rf_mae)) * 100.0, 1),
            }
        }
        self.feature_importances = importance_dict

        duration_ms = round((datetime.datetime.now() - start_time).total_seconds() * 1000, 2)

        return {
            "status": "success",
            "agent": "Price Agent",
            "step": 3,
            "duration_ms": duration_ms,
            "summary": (
                f"Trained CatBoost Regressor (R²: {self.metrics['catboost']['r2_score']}, MAPE: {self.metrics['catboost']['mape_pct']}%) "
                f"benchmarked against Random Forest (R²: {self.metrics['random_forest']['r2_score']}). "
                f"Top driver: {list(importance_dict.keys())[0]}."
            ),
            "metrics": self.metrics,
            "feature_importances": self.feature_importances,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
        }

    def predict_price(
        self,
        locality_name: str,
        property_type: str,
        area_sqft: float,
        bedrooms: float = 3.0,
        age: float = 2.0
    ) -> Dict[str, Any]:
        """
        Estimates the property's likely price using the trained CatBoost model,
        cross-referenced with the Random Forest benchmark and confidence interval bounds.
        """
        if not self.is_trained or self.catboost_model is None:
            # Fallback estimation if not yet trained in session
            # Approx base rate ~8,500/sqft
            base_sqft = 8500.0
            if "kokapet" in locality_name.lower():
                base_sqft = 11500.0
            elif "gachibowli" in locality_name.lower():
                base_sqft = 9800.0
            elif "tellapur" in locality_name.lower():
                base_sqft = 8200.0
            elif "kondapur" in locality_name.lower():
                base_sqft = 8700.0
            elif "miyapur" in locality_name.lower():
                base_sqft = 6400.0

            if "villa" in property_type.lower():
                base_sqft *= 1.25

            est = area_sqft * base_sqft
            return {
                "catboost_price": round(est, 2),
                "rf_benchmark_price": round(est * 1.02, 2),
                "estimated_price_per_sqft": round(base_sqft, 2),
                "confidence_lower": round(est * 0.92, 2),
                "confidence_upper": round(est * 1.08, 2),
                "confidence_interval_pct": 8.0,
                "model_status": "heuristic_fallback",
            }

        input_df = pd.DataFrame([{
            "area_sqft": float(area_sqft),
            "bedrooms": float(bedrooms),
            "age": float(age),
            "property_type": property_type.lower().replace("_", " "),
            "locality_name": locality_name
        }])

        cb_val = float(self.catboost_model.predict(input_df)[0])
        rf_val = float(self.rf_pipeline.predict(input_df)[0])

        # Enforce realistic positive pricing bounds
        cb_val = max(100_000.0, cb_val)
        rf_val = max(100_000.0, rf_val)

        mape_margin = (self.metrics.get("catboost", {}).get("mape_pct", 7.5) / 100.0)
        mape_margin = min(max(mape_margin, 0.05), 0.15)

        lower_bound = cb_val * (1.0 - mape_margin)
        upper_bound = cb_val * (1.0 + mape_margin)

        return {
            "catboost_price": round(cb_val, 2),
            "rf_benchmark_price": round(rf_val, 2),
            "estimated_price_per_sqft": round(cb_val / max(1.0, area_sqft), 2),
            "confidence_lower": round(lower_bound, 2),
            "confidence_upper": round(upper_bound, 2),
            "confidence_interval_pct": round(mape_margin * 100.0, 1),
            "model_status": "trained_catboost_inference",
            "features_used": {
                "locality": locality_name,
                "property_type": property_type,
                "area_sqft": area_sqft,
                "bedrooms": bedrooms,
                "age_years": age
            }
        }
