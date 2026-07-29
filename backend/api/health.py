"""Health check endpoint."""
from fastapi import APIRouter
from ..database import check_database_health
router = APIRouter(tags=["health"])

@router.get("/health")
async def health():
    db_health = await check_database_health()
    return {"status": "healthy", "databases": db_health, "version": "2.0.0"}
