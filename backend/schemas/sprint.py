"""Sprint-related schemas."""
from pydantic import BaseModel
from typing import Optional

class SprintCreate(BaseModel):
    name: str
    project_id: str
    goal: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class SprintUpdate(BaseModel):
    sprint_id: str
    name: Optional[str] = None
    status: Optional[str] = None
    goal: Optional[str] = None
