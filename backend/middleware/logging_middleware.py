"""Request logging middleware."""
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import structlog

log = structlog.get_logger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        log.info("request.started", method=request.method, path=str(request.url.path))
        response = await call_next(request)
        duration = time.time() - start
        log.info("request.finished", method=request.method, path=str(request.url.path), status=response.status_code, duration_ms=round(duration*1000, 1))
        return response
