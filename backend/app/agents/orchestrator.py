import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models import Property
from backend.app.agents.data_agent import DataAgent
from backend.app.agents.quality_agent import QualityAgent
from backend.app.agents.price_agent import PriceAgent
from backend.app.agents.trend_agent import TrendAgent
from backend.app.agents.recommendation_agent import RecommendationAgent
from backend.app.agents.validation_agent import ValidationAgent

class AgentOrchestrator:
    """
    Multi-Agent Orchestrator for RealEstateIQ
    Coordinates sequential execution of:
      Step 1: Data Agent
      Step 2: Quality Agent (Isolation Forest + deduplication)
      Step 3: Price Agent (CatBoost vs Random Forest benchmark)
      Step 4: Demand & Trend Agent (Exponential Smoothing)
      Step 5: Recommendation Agent (Python rule scoring)
      Step 6: Validation Agent (Completeness & Market Report)
    """

    _instance = None
    _latest_result: Optional[Dict[str, Any]] = None
    _price_agent_instance: Optional[PriceAgent] = None

    def __init__(self, db: Session):
        self.db = db
        self.data_agent = DataAgent(db)
        self.quality_agent = QualityAgent()
        self.price_agent = PriceAgent()
        self.trend_agent = TrendAgent()
        self.recommendation_agent = RecommendationAgent()
        self.validation_agent = ValidationAgent()
        AgentOrchestrator._price_agent_instance = self.price_agent

    @classmethod
    def get_latest_price_agent(cls) -> PriceAgent:
        if cls._price_agent_instance is None:
            cls._price_agent_instance = PriceAgent()
        return cls._price_agent_instance

    def run_pipeline(
        self,
        budget_min: float = 6_000_000.0,
        budget_max: float = 20_000_000.0,
        risk_preference: str = "balanced",
        property_type: str = "all"
    ) -> Dict[str, Any]:
        overall_start = datetime.datetime.now()
        timeline = []

        # ==========================================
        # STEP 1: DATA AGENT
        # ==========================================
        step1_start = datetime.datetime.now()
        data_res = self.data_agent.execute()
        timeline.append({
            "step": 1,
            "agent_name": "Data Agent",
            "status": data_res["status"],
            "timestamp": step1_start.strftime("%H:%M:%S.%f")[:-3],
            "duration_ms": data_res["duration_ms"],
            "summary": data_res["summary"],
            "key_metrics": data_res["metrics"]
        })

        # ==========================================
        # STEP 2: QUALITY AGENT
        # ==========================================
        step2_start = datetime.datetime.now()
        raw_props = data_res["data"]["properties"]
        quality_res = self.quality_agent.execute(raw_props)
        timeline.append({
            "step": 2,
            "agent_name": "Quality Agent",
            "status": quality_res["status"],
            "timestamp": step2_start.strftime("%H:%M:%S.%f")[:-3],
            "duration_ms": quality_res["duration_ms"],
            "summary": quality_res["summary"],
            "key_metrics": quality_res["metrics"],
            "flagged_anomalies_count": len(quality_res["flagged_properties"])
        })

        # Update suspicious flags in database
        try:
            flagged_ids = {f["id"] for f in quality_res.get("flagged_properties", []) if f.get("id")}
            for p in self.db.query(Property).all():
                if p.id in flagged_ids:
                    p.is_suspicious = True
                    match = next((f for f in quality_res["flagged_properties"] if f.get("id") == p.id), None)
                    p.suspicious_reason = "; ".join(match["reasons"]) if match else "Flagged by Isolation Forest"
                else:
                    p.is_suspicious = False
                    p.suspicious_reason = None
            self.db.commit()
        except Exception as e:
            self.db.rollback()

        # ==========================================
        # STEP 3: PRICE AGENT
        # ==========================================
        step3_start = datetime.datetime.now()
        clean_props = quality_res["clean_properties"]
        price_res = self.price_agent.train_and_benchmark(clean_props)
        timeline.append({
            "step": 3,
            "agent_name": "Price Agent",
            "status": price_res["status"],
            "timestamp": step3_start.strftime("%H:%M:%S.%f")[:-3],
            "duration_ms": price_res["duration_ms"],
            "summary": price_res["summary"],
            "key_metrics": price_res["metrics"],
            "feature_importances": price_res.get("feature_importances", {})
        })

        # ==========================================
        # STEP 4: DEMAND & TREND AGENT
        # ==========================================
        step4_start = datetime.datetime.now()
        localities = data_res["data"]["localities"]
        snapshots = data_res["data"]["snapshots"]
        signals = data_res["data"]["demand_signals"]
        trend_res = self.trend_agent.execute(localities, snapshots, signals)
        timeline.append({
            "step": 4,
            "agent_name": "Demand & Trend Agent",
            "status": trend_res["status"],
            "timestamp": step4_start.strftime("%H:%M:%S.%f")[:-3],
            "duration_ms": trend_res["duration_ms"],
            "summary": trend_res["summary"],
            "key_metrics": {
                "forecast_horizon_months": trend_res["forecast_horizon_months"],
                "micro_markets_covered": len(trend_res["forecasts"]),
                "model_type": trend_res["model_type"],
            }
        })

        # ==========================================
        # STEP 5: RECOMMENDATION AGENT
        # ==========================================
        step5_start = datetime.datetime.now()
        rec_res = self.recommendation_agent.execute(
            localities=localities,
            trend_results=trend_res,
            properties=clean_props,
            budget_min=budget_min,
            budget_max=budget_max,
            risk_preference=risk_preference,
            property_type=property_type
        )
        timeline.append({
            "step": 5,
            "agent_name": "Recommendation Agent",
            "status": rec_res["status"],
            "timestamp": step5_start.strftime("%H:%M:%S.%f")[:-3],
            "duration_ms": rec_res["duration_ms"],
            "summary": rec_res["summary"],
            "key_metrics": {
                "top_recommendation": rec_res.get("top_pick", {}).get("locality_name"),
                "top_suitability_score": rec_res.get("top_pick", {}).get("suitability_score"),
                "total_ranked": len(rec_res.get("recommendations", [])),
            }
        })

        # ==========================================
        # STEP 6: VALIDATION AGENT
        # ==========================================
        step6_start = datetime.datetime.now()
        val_res = self.validation_agent.execute(
            data_result=data_res,
            quality_result=quality_res,
            price_result=price_res,
            trend_result=trend_res,
            recommendation_result=rec_res
        )
        timeline.append({
            "step": 6,
            "agent_name": "Validation Agent",
            "status": val_res["status"],
            "timestamp": step6_start.strftime("%H:%M:%S.%f")[:-3],
            "duration_ms": val_res["duration_ms"],
            "summary": val_res["summary"],
            "key_metrics": {
                "all_checks_passed": val_res["all_checks_passed"],
                "valuation_margin": val_res["uncertainty"]["valuation_error_margin_pct"],
                "verdict": val_res["report"]["validation_verdict"]
            }
        })

        total_duration_ms = round((datetime.datetime.now() - overall_start).total_seconds() * 1000, 2)

        result_payload = {
            "status": "success",
            "executed_at": overall_start.strftime("%Y-%m-%d %H:%M:%S"),
            "total_duration_ms": total_duration_ms,
            "timeline": timeline,
            "agent_outputs": {
                "data_agent": data_res["metrics"],
                "quality_agent": {
                    "metrics": quality_res["metrics"],
                    "flagged_properties": quality_res["flagged_properties"],
                    "missing_info_records": quality_res["missing_info_records"]
                },
                "price_agent": {
                    "metrics": price_res["metrics"],
                    "feature_importances": price_res.get("feature_importances", {})
                },
                "trend_agent": {
                    "forecasts": trend_res["forecasts"],
                    "activity_scores": trend_res["activity_scores"]
                },
                "recommendation_agent": {
                    "recommendations": rec_res["recommendations"],
                    "top_pick": rec_res["top_pick"]
                },
                "validation_agent": {
                    "report": val_res["report"],
                    "uncertainty": val_res["uncertainty"],
                    "limitations": val_res["limitations"]
                }
            }
        }

        AgentOrchestrator._latest_result = result_payload
        return result_payload

    @classmethod
    def get_latest_result(cls) -> Optional[Dict[str, Any]]:
        return cls._latest_result
