"""
Точка входа FastAPI-приложения.
Инициализирует базу данных, создаёт подключение к s3 и регистрирует роутеры.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from apscheduler.schedulers.background import BackgroundScheduler

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.bootstrap import create_tables, ensure_storage, seed_roles
from app.storage.s3 import LOCALHOST_STORAGE_PREFIX, _public_base_url
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
    version="release/D-01.000.00.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)

class StorageUrlRewriteMiddleware(BaseHTTPMiddleware):
    """Подменяет localhost-URL хранилища на публичный для доступа через туннель."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        ct = response.headers.get("content-type", "")
        if response.status_code != 200 or "application/json" not in ct:
            return response
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        text = body.decode("utf-8", errors="replace")
        if LOCALHOST_STORAGE_PREFIX in text:
            public = _public_base_url()
            text = text.replace(LOCALHOST_STORAGE_PREFIX, public)
        new_body = text.encode("utf-8")
        headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
        return Response(
            content=new_body,
            status_code=response.status_code,
            headers=headers,
            media_type=ct,
        )


app.add_middleware(StorageUrlRewriteMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_tables()
    seed_roles()
    ensure_storage()
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
