"""Standard response schemas."""
from pydantic import BaseModel
from typing import Any, Optional

class SuccessResponse(BaseModel):
    success: bool = True
    data: Any = None
    message: str = ""

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None

class PaginatedResponse(BaseModel):
    items: list[Any] = []
    total: int = 0
    page: int = 1
    per_page: int = 20
    has_more: bool = False
