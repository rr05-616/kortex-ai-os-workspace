from __future__ import annotations
from fastapi import APIRouter
from .tasks import _tasks
from .sprints import _sprints
from .projects import _projects
from .analytics import get_analytics
router = APIRouter(prefix="/api", tags=["workspace"])

@router.get("/context")
async def get_workspace_context():
    return {"projects": list(_projects.values()), "tasks": list(_tasks.values()), "sprints": list(_sprints.values()), "analytics": await get_analytics()}
