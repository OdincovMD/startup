"""
Общие функции инициализации приложения.
Создание таблиц, начальные данные, подготовка хранилища.
"""

import app.models  # noqa: F401 — регистрация моделей в metadata
from app.database import Base, async_engine
from app.core.queries.async_orm import AsyncOrm
from app.storage.s3 import ensure_bucket_ready
from app.services.elasticsearch import (
    reindex_laboratories_if_empty,
    reindex_vacancies_if_empty,
    reindex_queries_if_empty,
    reindex_organizations_if_empty,
)

import logging

logger = logging.getLogger(__name__)


async def create_tables() -> None:
    """Создание всех таблиц в БД."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")


async def seed_roles() -> None:
    """Создание базовых ролей, если их нет."""
    for name in ("student", "researcher", "lab_admin", "lab_representative"):
        await AsyncOrm.get_or_create_role(name)
    logger.info("Roles seeded")


def ensure_storage() -> None:
    """Проверка и подготовка S3-хранилища (bucket, CORS, policy)."""
    ensure_bucket_ready()
    logger.info("Storage bucket ready")


async def ensure_elasticsearch_indexes() -> None:
    """Создание индексов Elasticsearch при старте и первичная индексация, если индекс пуст."""
    try:
        await reindex_laboratories_if_empty()
        await reindex_vacancies_if_empty()
        await reindex_queries_if_empty()
        await reindex_organizations_if_empty()
        logger.info("Elasticsearch indexes ready")
    except Exception as e:
        logger.warning("Elasticsearch initial indexing failed: %s", e, exc_info=True)