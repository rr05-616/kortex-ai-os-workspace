"""Project-related schemas."""
from pydantic import BaseModel
from typing import Optional

class ProjectImportRequest(BaseModel):
    url: str
    name: Optional[str] = None

class ProjectAnalyzeRequest(BaseModel):
    project_id: str
    url: str
    url_type: str = "github"
