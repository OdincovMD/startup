"""
Точка входа FastAPI-приложения.
Инициализирует базу данных, создаёт подключение к s3 и регистрирует роутеры.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.logging_config import setup_logging
from app.rate_limit import limiter
from app.bootstrap import create_tables, ensure_storage, seed_roles, ensure_elasticsearch_indexes
from app.middleware import StorageUrlRewriteMiddleware
from app.api import profile, storage, analytics
from app.core.api import auth, users, roles
from app.jobs.openalex_sync import sync_openalex_data
from app.roles.representative.api import (
    laboratories_public,
    queries_public,
    labs,
    vacancies_public,
    stats,
)

scheduler = BackgroundScheduler()

app = FastAPI(
    title="Синтезум",
    version="release/D-01.003.00.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(StorageUrlRewriteMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    setup_logging()
    create_tables()
    seed_roles()
    ensure_storage()
    await ensure_elasticsearch_indexes()
    scheduler.add_job(sync_openalex_data, "cron", hour=3, minute=0)
    scheduler.start()


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(labs.router, prefix="/api")
app.include_router(laboratories_public.router, prefix="/api")
app.include_router(queries_public.router, prefix="/api")
app.include_router(vacancies_public.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(roles.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(storage.router, prefix="/api")
