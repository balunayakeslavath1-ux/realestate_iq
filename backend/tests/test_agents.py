import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base
from backend.app.seed_data import init_seed_data
from backend.app.agents.orchestrator import AgentOrchestrator
from backend.app.agents.data_agent import DataAgent
from backend.app.agents.quality_agent import QualityAgent
from backend.app.agents.price_agent import PriceAgent
from backend.app.agents.trend_agent import TrendAgent
from backend.app.agents.recommendation_agent import RecommendationAgent
from backend.app.agents.validation_agent import ValidationAgent

@pytest.fixture(scope="module")
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    init_seed_data(db, force=True)
    yield db
    db.close()

def test_step1_data_agent(test_db):
    agent = DataAgent(test_db)
    result = agent.execute()
    assert result["status"] == "success"
    assert result["step"] == 1
    assert result["metrics"]["total_properties"] > 0
    assert result["metrics"]["total_localities"] >= 6
    assert "Kokapet" in result["metrics"]["primary_localities"]
    assert "Gachibowli" in result["metrics"]["primary_localities"]

def test_step2_quality_agent(test_db):
    data_agent = DataAgent(test_db)
    data_res = data_agent.execute()
    raw_props = data_res["data"]["properties"]

    quality_agent = QualityAgent()
    quality_res = quality_agent.execute(raw_props)

    assert quality_res["status"] == "success"
    assert quality_res["step"] == 2
    assert "clean_properties" in quality_res
    assert quality_res["metrics"]["duplicates_removed"] >= 1
    assert quality_res["metrics"]["clean_records_count"] > 0
    # Isolation Forest ran and detected suspicious records
    assert quality_res["metrics"]["suspicious_price_count"] >= 1
    assert quality_res["metrics"]["data_quality_score"] > 60.0

def test_step3_price_agent(test_db):
    data_res = DataAgent(test_db).execute()
    quality_res = QualityAgent().execute(data_res["data"]["properties"])
    clean_props = quality_res["clean_properties"]

    price_agent = PriceAgent()
    price_res = price_agent.train_and_benchmark(clean_props)

    assert price_res["status"] == "success"
    assert price_res["step"] == 3
    assert "catboost" in price_res["metrics"]
    assert "random_forest" in price_res["metrics"]
    assert price_res["metrics"]["catboost"]["r2_score"] >= 0.0

    # Test prediction
    pred = price_agent.predict_price(
        locality_name="Kokapet",
        property_type="apartment",
        area_sqft=1850.0,
        bedrooms=3.0,
        age=2.0
    )
    assert pred["catboost_price"] > 1_000_000.0
    assert pred["confidence_lower"] < pred["catboost_price"] < pred["confidence_upper"]

def test_step4_trend_agent(test_db):
    data_res = DataAgent(test_db).execute()
    trend_agent = TrendAgent(forecast_months=4)
    trend_res = trend_agent.execute(
        data_res["data"]["localities"],
        data_res["data"]["snapshots"],
        data_res["data"]["demand_signals"]
    )

    assert trend_res["status"] == "success"
    assert trend_res["step"] == 4
    assert "Kokapet" in trend_res["forecasts"]
    assert len(trend_res["forecasts"]["Kokapet"]["forecast"]) == 4
    assert trend_res["forecasts"]["Kokapet"]["projected_appreciation_pct"] > 0

def test_step5_recommendation_agent(test_db):
    data_res = DataAgent(test_db).execute()
    quality_res = QualityAgent().execute(data_res["data"]["properties"])
    trend_res = TrendAgent().execute(
        data_res["data"]["localities"],
        data_res["data"]["snapshots"],
        data_res["data"]["demand_signals"]
    )

    rec_agent = RecommendationAgent()
    rec_res = rec_agent.execute(
        localities=data_res["data"]["localities"],
        trend_results=trend_res,
        properties=quality_res["clean_properties"],
        budget_min=6_000_000.0,
        budget_max=25_000_000.0,
        risk_preference="balanced"
    )

    assert rec_res["status"] == "success"
    assert rec_res["step"] == 5
    assert len(rec_res["recommendations"]) >= 6
    assert rec_res["top_pick"] is not None
    assert rec_res["recommendations"][0]["suitability_score"] >= rec_res["recommendations"][-1]["suitability_score"]

def test_step6_validation_agent(test_db):
    orchestrator = AgentOrchestrator(test_db)
    result = orchestrator.run_pipeline()

    assert result["status"] == "success"
    assert len(result["timeline"]) == 6
    val_output = result["agent_outputs"]["validation_agent"]
    assert val_output["report"]["status"] == "Verified & Validated"
    assert val_output["report"]["validation_verdict"] == "APPROVED FOR EXECUTIVE DASHBOARD DISPLAY"
