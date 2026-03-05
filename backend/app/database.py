"""
Модуль для подключения к PostgreSQL и работы с SQLAlchemy ORM.
Здесь создаются:
- sync_engine: движок для синхронных подключений (psycopg2),
- session_factory: фабрика sync-сессий,
- async_engine: движок для асинхронных подключений (asyncpg),
- async_session_factory: фабрика async-сессий,
- BaseModel: абстрактный базовый класс для ORM-моделей,
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import settings

sync_engine = create_engine(
    url=settings.DATABASE_URL_pg,
    pool_size=5,
    max_overflow=10,
    future=True,
)

session_factory = sessionmaker(
    bind=sync_engine,
    autoflush=False,
    autocommit=False,
    future=True,
)

async_engine = create_async_engine(
    url=settings.DATABASE_URL_async,
    pool_size=5,
    max_overflow=10,
)

async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

Base = declarative_base()


class BaseModel(Base):
    """
    Базовый класс для всех ORM-моделей.
    Служит родителем для моделей в models.py.
    """
    __abstract__ = True

    def __repr__(self) -> str:
        """
        Человекочитаемое представление ORM-объекта.
        """
        cols = [f"{col}={getattr(self, col)}" for col in self.__table__.columns.keys()]
        return f"<{self.__class__.__name__} {', '.join(cols)}>"
