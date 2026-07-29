from __future__ import annotations
import time, uuid
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
router = APIRouter(prefix="/api", tags=["sprints"])

class SprintCreate(BaseModel):
    name: str
    project_id: Optional[str] = None
    goal: Optional[str] = None

_sprints: dict[str, dict] = {}

@router.get("/sprints")
async def list_sprints(project_id: Optional[str] = None):
    sprints = list(_sprints.values())
    if project_id: sprints = [s for s in sprints if s.get("project_id") == project_id]
    return {"sprints": sprints}

@router.post("/sprints")
async def create_sprint(body: SprintCreate):
    sid = f"sprint_{uuid.uuid4().hex[:8]}"
    sprint = {"id": sid, **body.model_dump(), "status": "planning", "tasks": [], "created_at": time.time()}
    _sprints[sid] = sprint
    return sprint

@router.patch("/sprints/{sprint_id}")
async def update_sprint(sprint_id: str, body: dict):
    if sprint_id not in _sprints: raise HTTPException(status_code=404, detail="Sprint not found")
    _sprints[sprint_id].update(body)
    return _sprints[sprint_id]
