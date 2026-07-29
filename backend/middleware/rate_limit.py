"""Simple rate limiter middleware using Redis."""
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
import structlog

log = structlog.get_logger(__name__)

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 60, window: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window
        self._local_counts: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        key = f"rl:{client_ip}"
        if key not in self._local_counts:
            self._local_counts[key] = []
        self._local_counts[key] = [t for t in self._local_counts[key] if now - t < self.window]
        if len(self._local_counts[key]) >= self.max_requests:
            log.warning("rate_limit.exceeded", client=client_ip)
            return JSONResponse({"error": "Rate limit exceeded", "retry_after": self.window}, status_code=429)
        self._local_counts[key].append(now)
        return await call_next(request)
