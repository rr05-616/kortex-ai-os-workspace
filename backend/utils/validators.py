"""Input validators."""
import re

def validate_url(url: str) -> bool:
    pattern = re.compile(r'^https?://[\w.-]+(?:/[\w./-]*)?$')
    return bool(pattern.match(url))

def validate_task_status(status: str) -> bool:
    valid = {"backlog", "todo", "in_progress", "in_review", "done", "cancelled"}
    return status in valid

def sanitize_text(text: str) -> str:
    return re.sub(r'[<>{}]', '', text).strip()
