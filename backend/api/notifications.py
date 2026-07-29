from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["notifications"])


@router.get("/notifications")
async def notifications():
    return [
        {
            "id": "n1",
            "title": "Backend initialized",
            "message": "The KORTEX AI backend is ready for AI and project workflows.",
            "read": False,
        }
    ]
