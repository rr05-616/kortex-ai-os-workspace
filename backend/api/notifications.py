from __future__ import annotations
from fastapi import APIRouter
router = APIRouter(prefix="/api", tags=["notifications"])
_notifications: list[dict] = []

@router.get("/notifications")
async def list_notifications(): return {"notifications": _notifications[:50]}

@router.get("/notifications/unread-count")
async def unread_count(): return {"count": sum(1 for n in _notifications if not n.get("read", False))}

@router.post("/notifications/mark-all-read")
async def mark_all_read():
    for n in _notifications: n["read"] = True
    return {"ok": True}
