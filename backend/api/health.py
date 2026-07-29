"""Health check endpoint."""
from __future__ import annotations
from fastapi import APIRouter, Request
router = APIRouter(tags=["health"])

@router.get("/health")
async def health(request: Request):
    deps = getattr(request.app.state, "dependency_status", {})
    status_val = "degraded" if any(v == "failed" for v in deps.values()) else "ok"
    return {"status": status_val, "version": "2.0.0", "dependencies": deps}
