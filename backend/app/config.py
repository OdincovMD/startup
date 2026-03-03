"""
Модуль конфигурации проекта.
Использует pydantic-settings для загрузки настроек из переменных окружения (.env).
Поддерживает DATABASE_URL (Docker) либо отдельные параметры DB_*.
"""

from typing import Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "hnkHNJhQ-FX2SOlFppIGlMWLsJvaOZlhFO66sOPn2-46y-hvfZCOXUItMGMP6TK8"


class Settings(BaseSettings):
    """
    Класс конфигурации приложения.
    Параметры берутся из переменных окружения или файла .env.
    """
    DATABASE_URL: Optional[str] = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "user"
    DB_PASS: str = "password"
    DB_NAME: str = "db"
    JWT_SECRET: str = DEFAULT_JWT_SECRET
    ENV: str = "development"  # development | production
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MIN: int = 45
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "labportal"
    S3_REGION: str = "us-east-1"
    S3_PUBLIC_BASE_URL: str = "http://localhost:9000/labportal"
    S3_FORCE_PATH_STYLE: bool = True
    S3_APPLY_CORS: bool = False

    OPENALEX_API_KEY: str = ""
    OPENALEX_BASE_URL: str = "https://api.openalex.org"

    ORCID_CLIENT_ID: str = ""
    ORCID_CLIENT_SECRET: str = ""
    ORCID_REDIRECT_URI: str = "https://api.pi-hardbox.ru/api/auth/orcid/callback"
    ORCID_AUTHORIZE_URL: str = "https://orcid.org/oauth/authorize"
    ORCID_TOKEN_URL: str = "https://orcid.org/oauth/token"
    FRONTEND_URL: str = "https://pi-hardbox.ru"
    CORS_ORIGINS: str = ""  # Comma-separated origins. Empty = FRONTEND_URL + localhost for dev.

    # Почта (верификация email, сброс пароля). Задаются через .env.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USE_TLS: bool = True
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_FROM_NAME: str = "Синтезум"

    # Шаблон URL профиля кандидата для писем об отклике. {user_id} — плейсхолдер.
    # Пример: https://pi-hardbox.ru/profile/{user_id}
    # Пусто — ссылка в письме не добавляется (до внедрения платной подписки).
    PROFILE_PUBLIC_URL_TEMPLATE: Optional[str] = None

    ELASTICSEARCH_URL: str = "http://localhost:9200"
    ELASTICSEARCH_REQUEST_TIMEOUT: int = 60  # индекс может инициализироваться до 1 мин
    VACANCIES_INDEX: str = "vacancies"
    QUERIES_INDEX: str = "queries"

    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "plain"  # plain | json
    LOG_FILE_PATH: Optional[str] = None  # если задан — пишем в файл (для монтирования на хост)

    @property
    def cors_origins_list(self) -> list[str]:
        """Allowed CORS origins. In development, includes localhost."""
        if self.CORS_ORIGINS.strip():
            return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        origins = [self.FRONTEND_URL.rstrip("/")]
        if self.ENV == "development":
            origins.extend(["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"])
        return origins

    @property
    def DATABASE_URL_pg(self) -> str:
        """
        Формирует строку подключения к PostgreSQL для SQLAlchemy.
        Если задан DATABASE_URL — используется он, иначе собирается из DB_*.
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
