"""Request context middleware — adds request ID and timing."""
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import structlog

log = structlog.get_logger(__name__)

class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        request.state.start_time = time.time()
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        response = await call_next(request)
        elapsed = time.time() - request.state.start_time
        log.info("request.completed", method=request.method, path=str(request.url.path), status=response.status_code, elapsed_ms=round(elapsed*1000, 1))
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{elapsed:.3f}s"
        return response
