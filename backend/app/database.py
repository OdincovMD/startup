"""
Модуль для подключения к PostgreSQL и работы с SQLAlchemy ORM.
- async_engine: движок для асинхронных подключений (asyncpg),
- async_session_factory: фабрика async-сессий,
- BaseModel: абстрактный базовый класс для ORM-моделей.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.declarative import declarative_base

from app.config import settings

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
