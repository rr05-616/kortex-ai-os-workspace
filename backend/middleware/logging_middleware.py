from __future__ import annotations
import time
import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
log = structlog.get_logger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.monotonic()
        response = await call_next(request)
        log.info("kortex.request", method=request.method, path=request.url.path, status=response.status_code, duration_ms=round((time.monotonic() - start) * 1000, 1))
        return response
