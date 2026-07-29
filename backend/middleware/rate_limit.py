from __future__ import annotations
import time
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 60, window: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window
        self._hits: dict[str, list[float]] = defaultdict(list)
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/health", "/docs", "/openapi.json"):
            return await call_next(request)
        client_id = request.client.host if request.client else "unknown"
        now = time.time()
        self._hits[client_id] = [t for t in self._hits[client_id] if t > now - self.window]
        if len(self._hits[client_id]) >= self.max_requests:
            return JSONResponse(status_code=429, content={"error": "rate_limit_exceeded"})
        self._hits[client_id].append(now)
        return await call_next(request)
