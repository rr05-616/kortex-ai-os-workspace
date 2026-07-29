from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["tasks"])


class TaskCreateRequest(BaseModel):
    title: str
    description: str | None = None
    status: str = "todo"
    priority: str = "medium"


@router.post("/tasks")
async def create_task(payload: TaskCreateRequest):
    return {
        "id": "task-1",
        "title": payload.title,
        "description": payload.description or "",
        "status": payload.status,
        "priority": payload.priority,
    }


@router.get("/tasks")
async def list_tasks():
    return [
        {
            "id": "task-1",
            "title": "Review project backlog",
            "description": "Inspect imported repository context",
            "status": "todo",
            "priority": "high",
        }
    ]
