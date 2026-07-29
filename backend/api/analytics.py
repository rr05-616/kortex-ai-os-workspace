from __future__ import annotations
from fastapi import APIRouter
from .tasks import _tasks
from .sprints import _sprints
from .projects import _projects
router = APIRouter(prefix="/api", tags=["analytics"])

@router.get("/analytics")
async def get_analytics():
    total = len(_tasks)
    done = sum(1 for t in _tasks.values() if t.get("status") == "done")
    in_prog = sum(1 for t in _tasks.values() if t.get("status") == "in_progress")
    return {"total_tasks": total, "completed_tasks": done, "in_progress_tasks": in_prog, "completion_rate": round(done / total * 100, 1) if total else 0, "total_sprints": len(_sprints), "total_projects": len(_projects), "health_score": min(100, max(0, 50 + (done * 5) - (in_prog * 2))) if total else 0}
