from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["sprints"])


class SprintCreateRequest(BaseModel):
    name: str
    goal: str | None = None


@router.post("/sprints")
async def create_sprint(payload: SprintCreateRequest):
    return {
        "id": "sprint-1",
        "name": payload.name,
        "goal": payload.goal or "",
        "status": "planning",
        "task_count": 0,
        "completed_tasks": 0,
    }
