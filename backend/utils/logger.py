"""Structured logging utility."""
import structlog
from typing import Optional

def get_logger(name: Optional[str] = None):
    return structlog.get_logger(name)
