"""
Общие функции инициализации приложения.
Создание таблиц, начальные данные, подготовка хранилища.
"""

import app.models  # noqa: F401 — регистрация моделей в metadata
from app.database import Base, sync_engine
from app.core.queries.sync_orm import SyncOrm as UserSyncOrm
from app.storage.s3 import ensure_bucket_ready


def create_tables() -> None:
    """Создание всех таблиц в БД."""
    Base.metadata.create_all(sync_engine)


def seed_roles() -> None:
    """Создание базовых ролей, если их нет."""
    for name in ("student", "researcher", "lab_admin", "lab_representative"):
        UserSyncOrm.get_or_create_role(name)


def ensure_storage() -> None:
    """Проверка и подготовка S3-хранилища (bucket, CORS, policy)."""
    ensure_bucket_ready()
