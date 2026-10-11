from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.database import get_db
from backend.app.models import Locality, Property
from backend.app.config import settings

router = APIRouter(prefix="", tags=["Health"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    loc_count = db.query(Locality).count() if db_status == "connected" else 0
    prop_count = db.query(Property).count() if db_status == "connected" else 0

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": db_status,
        "localities_count": loc_count,
        "properties_count": prop_count,
        "is_simulated_demo": settings.DATA_IS_SIMULATED
    }
