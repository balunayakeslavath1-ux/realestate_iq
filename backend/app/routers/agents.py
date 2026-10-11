from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.agents.orchestrator import AgentOrchestrator

router = APIRouter(prefix="/agents", tags=["Multi-Agent Intelligence"])

class RunAgentsRequest(BaseModel):
    budget_min: Optional[float] = Field(6_000_000.0, description="Minimum investment budget in INR")
    budget_max: Optional[float] = Field(20_000_000.0, description="Maximum investment budget in INR")
    risk_preference: Optional[str] = Field("balanced", description="conservative, balanced, or aggressive")
    property_type: Optional[str] = Field("all", description="apartment, villa, or all")

class PricePredictionRequest(BaseModel):
    locality_name: str = Field(..., example="Kokapet")
    property_type: str = Field("apartment", example="apartment")
    area_sqft: float = Field(..., gt=0, example=1850.0)
    bedrooms: float = Field(3.0, ge=1.0, example=3.0)
    age: float = Field(2.0, ge=0.0, example=2.0)

class PricePredictionResponse(BaseModel):
    locality_name: str
    property_type: str
    area_sqft: float
    bedrooms: float
    age: float
    catboost_price: float
    rf_benchmark_price: float
    estimated_price_per_sqft: float
    confidence_lower: float
    confidence_upper: float
    confidence_interval_pct: float
    model_status: str

@router.post("/run")
def run_agent_analysis(
    request: Optional[RunAgentsRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Executes the 6-agent RealEstateIQ workflow:
    Step 1: Data Agent (Ingestion)
    Step 2: Quality Agent (Isolation Forest + Deduplication)
    Step 3: Price Agent (CatBoost vs Random Forest benchmark)
    Step 4: Demand & Trend Agent (Exponential Smoothing)
    Step 5: Recommendation Agent (Scoring & Ranking)
    Step 6: Validation Agent (Report & Uncertainty)
    """
    req = request or RunAgentsRequest()
    orchestrator = AgentOrchestrator(db)
    result = orchestrator.run_pipeline(
        budget_min=req.budget_min or 6_000_000.0,
        budget_max=req.budget_max or 20_000_000.0,
        risk_preference=req.risk_preference or "balanced",
        property_type=req.property_type or "all"
    )
    return result

@router.post("/predict-price", response_model=PricePredictionResponse)
def predict_property_price(
    request: PricePredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluates a property's likely market price using the trained CatBoost model
    benchmarked against Random Forest, with 95% confidence bounds.
    """
    orchestrator = AgentOrchestrator(db)
    # Ensure price agent is trained if not already
    if not orchestrator.price_agent.is_trained:
        orchestrator.run_pipeline()

    pred = orchestrator.price_agent.predict_price(
        locality_name=request.locality_name,
        property_type=request.property_type,
        area_sqft=request.area_sqft,
        bedrooms=request.bedrooms,
        age=request.age
    )

    return PricePredictionResponse(
        locality_name=request.locality_name,
        property_type=request.property_type,
        area_sqft=request.area_sqft,
        bedrooms=request.bedrooms,
        age=request.age,
        catboost_price=pred["catboost_price"],
        rf_benchmark_price=pred["rf_benchmark_price"],
        estimated_price_per_sqft=pred["estimated_price_per_sqft"],
        confidence_lower=pred["confidence_lower"],
        confidence_upper=pred["confidence_upper"],
        confidence_interval_pct=pred["confidence_interval_pct"],
        model_status=pred["model_status"]
    )

@router.get("/latest-report")
def get_latest_report(db: Session = Depends(get_db)):
    """
    Retrieves the latest verified market report and multi-agent metrics.
    """
    latest = AgentOrchestrator.get_latest_result()
    if not latest:
        orchestrator = AgentOrchestrator(db)
        latest = orchestrator.run_pipeline()
    return latest

@router.get("/forecast")
def get_locality_forecast(
    locality_name: Optional[str] = Query(None, description="Specific locality name, e.g. Kokapet"),
    db: Session = Depends(get_db)
):
    """
    Retrieves the Exponential Smoothing price and inventory forecasts.
    """
    latest = AgentOrchestrator.get_latest_result()
    if not latest:
        orchestrator = AgentOrchestrator(db)
        latest = orchestrator.run_pipeline()
    
    forecasts = latest.get("agent_outputs", {}).get("trend_agent", {}).get("forecasts", {})
    if locality_name:
        for name, data in forecasts.items():
            if locality_name.lower() in name.lower():
                return {"locality_name": name, "forecast_data": data}
        raise HTTPException(status_code=404, detail=f"No forecast found for locality '{locality_name}'")
    
    return {"all_forecasts": forecasts}
