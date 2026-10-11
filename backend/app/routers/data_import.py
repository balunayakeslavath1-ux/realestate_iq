from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.schemas import (
    ImportSummaryResponse,
    ApifySyncRequest,
    ApifySyncResponse
)
from backend.app.importer import import_properties_from_csv, generate_csv_template
from backend.app.seed_data import init_seed_data
from backend.app.services.apify_service import ApifyService

router = APIRouter(prefix="/import", tags=["Data Import"])

@router.post("/csv", response_model=ImportSummaryResponse)
async def upload_properties_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Enforce reasonable file-size limit (e.g. 5MB)
    MAX_SIZE = 5 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 5MB maximum limit."
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a .csv format."
        )

    summary = import_properties_from_csv(content, db)
    return ImportSummaryResponse(**summary)

@router.get("/template", response_class=PlainTextResponse)
def get_csv_template():
    csv_text = generate_csv_template()
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=propscope_import_template.csv"}
    )

@router.post("/reset-seed")
def reset_demo_database(db: Session = Depends(get_db)):
    """Safe reset and re-initialization of demo seed dataset."""
    init_seed_data(db, force=True)
    return {"status": "success", "message": "Demo database successfully re-seeded."}

@router.post("/apify-sync", response_model=ApifySyncResponse)
def sync_apify_properties(
    req: Optional[ApifySyncRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Feature 5: Ingest live property listings via Apify API into the platform.
    Converts returned records into property-card format, updates database,
    and refreshes listings without code changes.
    """
    actor_id = req.actor_id if req else None
    dataset_id = req.dataset_id if req else None
    limit = req.limit if req and req.limit else 20

    service = ApifyService()
    result = service.sync_into_database(
        db=db,
        dataset_id=dataset_id,
        actor_id=actor_id,
        limit=limit
    )

    return ApifySyncResponse(
        status=result["status"],
        source=result["source"],
        records_fetched=result["records_fetched"],
        records_imported=result["records_imported"],
        records_updated=result["records_updated"],
        message=result["message"]
    )
