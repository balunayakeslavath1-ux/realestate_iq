from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal, migrate_db
from backend.app.seed_data import init_seed_data
from backend.app.auth import init_default_users
from backend.app.routers import (
    health,
    localities,
    properties,
    market,
    data_import,
    agents,
    auth,
    favorites
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="RealEstateIQ Market Intelligence & Cooperative Multi-Agent Platform."
)

@app.on_event("startup")
def startup_event():
    migrate_db()
    db = SessionLocal()
    try:
        init_seed_data(db, force=False)
        init_default_users(db)
    finally:
        db.close()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(localities.router, prefix=settings.API_V1_STR)
app.include_router(properties.router, prefix=settings.API_V1_STR)
app.include_router(favorites.router, prefix=settings.API_V1_STR)
app.include_router(market.router, prefix=settings.API_V1_STR)
app.include_router(data_import.router, prefix=settings.API_V1_STR)
app.include_router(agents.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }
