import datetime
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd

class HoltExponentialSmoothing:
    """
    Holt's Linear Exponential Smoothing with damped trend.
    Mathematically models level and trend components:
      Level:  l_t = alpha * y_t + (1 - alpha) * (l_{t-1} + phi * b_{t-1})
      Trend:  b_t = beta * (l_t - l_{t-1}) + (1 - beta) * phi * b_{t-1}
      Forecast: y_{t+h} = l_t + sum_{i=1}^h (phi^i * b_t)
    Pure NumPy implementation ensuring zero DLL dependency issues on Windows.
    """
    def __init__(self, alpha: float = 0.45, beta: float = 0.25, phi: float = 0.90):
        self.alpha = alpha
        self.beta = beta
        self.phi = phi
        self.level_ = None
        self.trend_ = None

    def fit(self, series: np.ndarray):
        y = np.asarray(series, dtype=float)
        n = len(y)
        if n < 2:
            self.level_ = float(y[0]) if n == 1 else 0.0
            self.trend_ = 0.0
            return self

        # Initialize level and trend from first two observations
        self.level_ = float(y[0])
        self.trend_ = float(y[1] - y[0])

        for t in range(1, n):
            prev_level = self.level_
            prev_trend = self.trend_

            # Update level
            self.level_ = self.alpha * y[t] + (1.0 - self.alpha) * (prev_level + self.phi * prev_trend)
            # Update trend
            self.trend_ = self.beta * (self.level_ - prev_level) + (1.0 - self.beta) * (self.phi * prev_trend)

        return self

    def forecast(self, steps: int = 4) -> np.ndarray:
        forecasts = []
        cum_phi = 0.0
        for h in range(1, steps + 1):
            cum_phi += (self.phi ** h)
            pred = self.level_ + cum_phi * self.trend_
            forecasts.append(pred)
        return np.array(forecasts, dtype=float)


class TrendAgent:
    """
    Step 4 — Demand and Trend Agents
    Analyzes historical prices, recorded supply, and demand signals to estimate
    locality activity scores (0-100) and forecast future price trajectories
    using Exponential Smoothing.
    """

    def __init__(self, forecast_months: int = 4):
        self.forecast_months = forecast_months

    def execute(
        self,
        localities: List[Dict[str, Any]],
        snapshots: List[Dict[str, Any]],
        signals: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        start_time = datetime.datetime.now()

        snap_df = pd.DataFrame(snapshots)
        sig_df = pd.DataFrame(signals) if signals else pd.DataFrame()

        locality_forecasts = {}
        activity_scores = {}

        for loc in localities:
            loc_id = loc["id"]
            loc_name = loc["name"]

            # Filter snapshots for this locality (sale, apartment/all)
            loc_snaps = snap_df[
                (snap_df["locality_id"] == loc_id) &
                (snap_df["listing_type"] == "sale")
            ].sort_values("observation_date").copy()

            if len(loc_snaps) >= 4:
                price_series = loc_snaps["median_price_per_sqft"].values.astype(float)
                inv_series = loc_snaps["active_listing_count"].values.astype(float)
                dates = loc_snaps["observation_date"].tolist()

                # Exponential Smoothing for Price Trend
                price_model = HoltExponentialSmoothing(alpha=0.45, beta=0.25, phi=0.92)
                price_model.fit(price_series)
                price_forecast = price_model.forecast(self.forecast_months)

                # Exponential Smoothing for Inventory / Supply
                inv_model = HoltExponentialSmoothing(alpha=0.40, beta=0.20, phi=0.90)
                inv_model.fit(inv_series)
                inv_forecast = inv_model.forecast(self.forecast_months)

                # Project future dates
                last_dt = datetime.date.fromisoformat(dates[-1])
                forecast_points = []
                for step, (f_price, f_inv) in enumerate(zip(price_forecast, inv_forecast), start=1):
                    # Next month date approximation
                    next_year = last_dt.year + ((last_dt.month + step - 1) // 12)
                    next_month = ((last_dt.month + step - 1) % 12) + 1
                    f_dt = datetime.date(next_year, next_month, 1)

                    forecast_points.append({
                        "observation_date": f_dt.isoformat(),
                        "period_label": f_dt.strftime("%b %Y"),
                        "median_price_per_sqft": round(float(f_price), 2),
                        "active_listing_count": max(10, int(round(float(f_inv)))),
                        "is_forecast": True,
                    })

                historical_points = [
                    {
                        "observation_date": row["observation_date"],
                        "period_label": datetime.date.fromisoformat(row["observation_date"]).strftime("%b %Y"),
                        "median_price_per_sqft": round(float(row["median_price_per_sqft"]), 2),
                        "active_listing_count": int(row["active_listing_count"]),
                        "is_forecast": False,
                    }
                    for _, row in loc_snaps.iterrows()
                ]

                # Projected annualized appreciation %
                first_hist = price_series[0]
                latest_hist = price_series[-1]
                end_forecast = price_forecast[-1]
                total_growth = (end_forecast - latest_hist) / latest_hist
                annualized_pct = round(float(total_growth * (12.0 / self.forecast_months) * 100.0), 2)

                locality_forecasts[loc_name] = {
                    "historical": historical_points,
                    "forecast": forecast_points,
                    "combined": historical_points + forecast_points,
                    "projected_appreciation_pct": annualized_pct,
                    "trend_direction": "Strong Bullish" if annualized_pct >= 12 else ("Moderate Growth" if annualized_pct >= 6 else "Stable"),
                    "model_used": "Exponential Smoothing (Holt's Damped Linear Trend)",
                }
            else:
                locality_forecasts[loc_name] = {
                    "historical": [],
                    "forecast": [],
                    "combined": [],
                    "projected_appreciation_pct": 8.0,
                    "trend_direction": "Stable",
                    "model_used": "Insufficient historical points",
                }

            # 2. Activity / Demand Score Computation (0 - 100)
            if not sig_df.empty:
                loc_sigs = sig_df[sig_df["locality_id"] == loc_id]
                if not loc_sigs.empty:
                    mean_val = float(loc_sigs["signal_value"].mean())
                    norm_score = min(max(round(mean_val, 1), 0.0), 100.0)
                else:
                    norm_score = 65.0
            else:
                norm_score = 60.0

            activity_scores[loc_name] = {
                "score": norm_score,
                "label": "High Activity" if norm_score >= 75 else ("Moderate Activity" if norm_score >= 50 else "Low Activity"),
                "velocity_index": round(norm_score * 0.95, 1)
            }

        duration_ms = round((datetime.datetime.now() - start_time).total_seconds() * 1000, 2)

        return {
            "status": "success",
            "agent": "Demand & Trend Agent",
            "step": 4,
            "duration_ms": duration_ms,
            "summary": (
                f"Generated Exponential Smoothing forecasts ({self.forecast_months} months ahead) "
                f"and calculated demand activity scores for {len(localities)} micro-markets."
            ),
            "forecasts": locality_forecasts,
            "activity_scores": activity_scores,
            "forecast_horizon_months": self.forecast_months,
            "model_type": "Exponential Smoothing (Holt's Damped Linear Trend)",
        }
