"""KORTEX AI — Structured Logging Configuration.

Every AI request logs: intent, context size, tools used, reasoning time, LLM latency, streaming duration, errors.
"""

from __future__ import annotations

import sys
import structlog


def configure_logging(log_level: str = "INFO", log_format: str = "json"):
    """Configure structured logging for the entire backend."""
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
    ]

    if log_format == "json":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(sys.modules["logging"], log_level.upper(), 20)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stderr),
        cache_logger_on_first_use=True,
    )
