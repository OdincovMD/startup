"""
Общие функции инициализации приложения.
Создание таблиц (async_engine), seed_roles через Core Orm, S3, Elasticsearch.
"""

import app.models  # noqa: F401 — регистрация моделей в metadata
from app.database import Base, async_engine, async_session_factory
from app.core.queries.orm import Orm
from app.storage.s3 import ensure_bucket_ready
from app.services.elasticsearch import (
    reindex_laboratories_if_empty,
    reindex_vacancies_if_empty,
    reindex_queries_if_empty,
    reindex_organizations_if_empty,
    reindex_applicants_if_empty,
)
from app import models

import logging

logger = logging.getLogger(__name__)


async def create_tables() -> None:
    """Создание всех таблиц в БД."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")


async def seed_roles() -> None:
    """Создание базовых ролей, если их нет."""
    for name in ("student", "researcher", "lab_admin", "lab_representative", "platform_admin"):
        await Orm.get_or_create_role(name)
    logger.info("Roles seeded")


def ensure_storage() -> None:
    """Проверка и подготовка S3-хранилища (bucket, CORS, policy)."""
    ensure_bucket_ready()
    logger.info("Storage bucket ready")


async def seed_trial_subscriptions() -> None:
    """Тестовый период: проставить бессрочную Pro-подписку всем пользователям без активной подписки."""
    from datetime import datetime, timezone
    from sqlalchemy import select, not_, exists

    async with async_session_factory() as session:
        now = datetime.now(timezone.utc)
        active_sub_subq = (
            select(models.UserSubscription.user_id)
            .where(
                models.UserSubscription.user_id == models.User.id,
                Orm._subscription_paid_filter(now),
            )
            .correlate(models.User)
        )
        stmt = select(models.User.id).where(~exists(active_sub_subq))
        result = await session.execute(stmt)
        user_ids = list(result.scalars().all())

    count = 0
    for user_id in user_ids:
        try:
            await Orm.create_subscription(user_id, audience="representative", tier="pro")
            count += 1
        except Exception as e:
            logger.warning("Failed to seed trial subscription for user_id=%s: %s", user_id, e)

    if count:
        logger.info("Trial subscriptions seeded: %d users", count)


async def ensure_elasticsearch_indexes() -> None:
    """Создание индексов Elasticsearch при старте и первичная индексация, если индекс пуст."""
    try:
        await reindex_laboratories_if_empty()
        await reindex_vacancies_if_empty()
        await reindex_queries_if_empty()
        await reindex_organizations_if_empty()
        await reindex_applicants_if_empty()
        logger.info("Elasticsearch indexes ready")
    except Exception as e:
        logger.warning("Elasticsearch initial indexing failed: %s", e, exc_info=True)