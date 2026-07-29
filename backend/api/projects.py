from __future__ import annotations
import time, uuid
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
router = APIRouter(prefix="/api", tags=["projects"])

class ProjectImportRequest(BaseModel):
    url: str
    name: Optional[str] = None

_projects: dict[str, dict] = {}

@router.get("/projects")
async def list_projects():
    return {"projects": list(_projects.values())}

@router.post("/projects/import")
async def import_project(body: ProjectImportRequest):
    pid = f"proj_{uuid.uuid4().hex[:8]}"
    project = {"id": pid, "name": body.name or body.url.split("/")[-1], "url": body.url, "status": "analyzing", "created_at": time.time()}
    _projects[pid] = project
    return project

@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    if project_id not in _projects: raise HTTPException(status_code=404, detail="Project not found")
    return _projects[project_id]

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    if project_id not in _projects: raise HTTPException(status_code=404, detail="Project not found")
    del _projects[project_id]
    return {"deleted": True}
