"""Common helper functions."""
import uuid
import hashlib
from datetime import datetime

def generate_id(prefix: str = "") -> str:
    uid = uuid.uuid4().hex[:12]
    return f"{prefix}_{uid}" if prefix else uid

def format_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.1f}s"
    if seconds < 3600:
        return f"{seconds/60:.1f}m"
    return f"{seconds/3600:.1f}h"

def truncate_text(text: str, max_len: int = 500) -> str:
    if len(text) <= max_len:
        return text
    return text[:max_len-3] + "..."

def hash_content(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()[:16]
