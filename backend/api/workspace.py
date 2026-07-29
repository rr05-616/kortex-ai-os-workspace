from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["workspace"])


@router.get("/workspace")
async def workspace():
    return {
        "id": "workspace-1",
        "name": "KORTEX AI Workspace",
        "project_count": 1,
        "active_sprint": "Sprint 1",
        "status": "ready",
    }
