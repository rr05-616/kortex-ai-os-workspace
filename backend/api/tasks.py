from __future__ import annotations
import time, uuid
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
router = APIRouter(prefix="/api", tags=["tasks"])

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    priority: str = "medium"
    status: str = "todo"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None

_tasks: dict[str, dict] = {}

@router.get("/tasks")
async def list_tasks(project_id: Optional[str] = None):
    tasks = list(_tasks.values())
    if project_id: tasks = [t for t in tasks if t.get("project_id") == project_id]
    return {"tasks": tasks}

@router.post("/tasks")
async def create_task(body: TaskCreate):
    tid = f"task_{uuid.uuid4().hex[:8]}"
    task = {"id": tid, **body.model_dump(), "created_at": time.time(), "updated_at": time.time()}
    _tasks[tid] = task
    return task

@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate):
    if task_id not in _tasks: raise HTTPException(status_code=404, detail="Task not found")
    _tasks[task_id].update({**body.model_dump(exclude_unset=True), "updated_at": time.time()})
    return _tasks[task_id]

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    if task_id not in _tasks: raise HTTPException(status_code=404, detail="Task not found")
    del _tasks[task_id]
    return {"deleted": True}
