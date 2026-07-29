from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/analytics")
async def analytics():
    return {
        "overview": {
            "total_projects": 1,
            "active_projects": 1,
            "completion_rate": 74.0,
        },
        "insights": [
            "Project import flow is active.",
            "AI copilots are routed through the backend.",
        ],
    }
