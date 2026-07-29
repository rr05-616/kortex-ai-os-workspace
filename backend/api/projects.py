from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.project_import_service import ProjectImportService

router = APIRouter(prefix="/api", tags=["projects"])


class ProjectCreateRequest(BaseModel):
    name: str
    description: str | None = None
    owner_id: str | None = None


class ProjectImportRequest(BaseModel):
    url: str
    name: str | None = None


@router.post("/projects")
async def create_project(payload: ProjectCreateRequest):
    return {
        "id": "project-1",
        "name": payload.name,
        "description": payload.description or "",
        "status": "planning",
        "health_score": 85.0,
    }


@router.get("/projects")
async def list_projects():
    return [
        {
            "id": "project-1",
            "name": "KORTEX AI",
            "description": "AI-native operations workspace",
            "status": "active",
            "health_score": 90.0,
        }
    ]


@router.post("/projects/import")
async def import_project(payload: ProjectImportRequest):
    service = ProjectImportService()
    try:
        owner, repo = service.parse_repo_url(payload.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    metadata = {
        "name": payload.name or repo,
        "description": f"Imported repository {owner}/{repo}",
        "language": "Python",
        "private": False,
        "html_url": payload.url,
    }
    analysis = service.build_analysis_from_metadata(
        metadata,
        files=["main.py", "requirements.txt", "README.md"],
        folders=["backend", "src"],
    )
    return {
        "project": {
            "id": f"import-{owner}-{repo}",
            "name": payload.name or repo,
            "description": metadata["description"],
            "status": "imported",
            "health_score": 88.0,
        },
        "analysis": analysis,
    }
