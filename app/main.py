"""
app/main.py – FastAPI application factory for Mark API.

Features
────────
• Structured logging via structlog
• Request-ID middleware (X-Request-ID header)
• Basic rate limiting (slowapi, 30 req/min per IP by default)
• OpenAPI docs enriched with examples
• Clean startup/shutdown lifecycle
"""
from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.routes.campaigns import router as campaigns_router
from app.routes.health import router as health_router

# ── Logging setup ─────────────────────────────────────────────────────────────


def _configure_logging() -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.dev.ConsoleRenderer()
            if settings.debug
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.log_level.upper(), logging.INFO)
        ),
        logger_factory=structlog.PrintLoggerFactory(),
    )
    # Also configure standard logging to go through structlog
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
    )


_configure_logging()
logger = structlog.get_logger(__name__)

# ── Rate limiter ──────────────────────────────────────────────────────────────

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.rate_limit_per_minute}/minute"],
)

# ── Request-ID middleware ─────────────────────────────────────────────────────


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Attaches a unique request ID to each incoming request.
    Reads X-Request-ID from the client if present, otherwise generates one.
    Echoes the request ID in the response header.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        structlog.contextvars.bind_contextvars(request_id=request_id)

        start = time.perf_counter()
        response: Response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-Ms"] = str(duration_ms)

        logger.info(
            "request completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        structlog.contextvars.clear_contextvars()
        return response


# ── Lifespan ──────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info(
        "Mark API starting",
        name=settings.app_name,
        version=settings.app_version,
        model=settings.gemini_model,
    )
    yield
    logger.info("Mark API shutting down")


# ── Application factory ───────────────────────────────────────────────────────


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "**Mark** – AI-powered marketing campaign generator.\n\n"
            "Generates full email campaigns (copy, HTML, critique) via Google Gemini.\n\n"
            "## Workflow\n"
            "1. **Clarify** – validate inputs or request clarification\n"
            "2. **Research** – LLM knowledge research\n"
            "3. **Strategy** – campaign blueprint\n"
            "4. **Execution** – email copy assets\n"
            "5. **Production** – responsive HTML\n"
            "6. **Critique** – self-review (LLM + rule-based)\n"
        ),
        openapi_tags=[
            {
                "name": "Campaigns",
                "description": "Generate and validate marketing campaigns.",
            },
            {
                "name": "Health",
                "description": "Liveness and readiness probes.",
            },
        ],
        license_info={"name": "Proprietary"},
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # ── Middleware (order matters – outermost first) ───────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(SlowAPIMiddleware)

    # ── Rate limit error handler ──────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(health_router)
    app.include_router(campaigns_router)

    return app


app = create_app()
