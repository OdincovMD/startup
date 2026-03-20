# Руководство разработчика — Синтезум

Инструкции по локальной разработке: запуск, структура проекта, база данных, Elasticsearch, переменные окружения.

---

## Оглавление

1. [Требования](#1-требования)
2. [Быстрый старт (Docker)](#2-быстрый-старт-docker)
3. [Переменные окружения](#3-переменные-окружения)
4. [Запуск без Docker](#4-запуск-без-docker)
5. [Структура проекта](#5-структура-проекта)
6. [База данных](#6-база-данных)
7. [Elasticsearch](#7-elasticsearch)
8. [Линтеры и форматтеры](#8-линтеры-и-форматтеры)
9. [Отладка и логи](#9-отладка-и-логи)

---

## 1. Требования

### Вариант A: Docker (рекомендуется)

- Docker 20+
- Docker Compose v2+

### Вариант B: Локально

- Python 3.12+
- Node.js 22+
- PostgreSQL 16
- Elasticsearch 8.11
- MinIO (или S3-совместимое хранилище)

---

## 2. Быстрый старт (Docker)

### Подготовка

1. Клонируйте репозиторий.
2. Создайте `.env` в корне проекта (см. [Переменные окружения](#3-переменные-окружения)).

### Запуск

```bash
docker compose up --build
```

Сервисы:
- **Nginx** — `http://localhost:${NGINX_PORT}` (по умолчанию 80)
- **Frontend** — проксируется через Nginx на `/`
- **Backend** — проксируется на `/api/`
- **PostgreSQL** — порт `${DB_PORT_HOST}` (5432)
- **Elasticsearch** — порт `${ELASTICSEARCH_PORT_HOST}` (9200)
- **MinIO** — API `${MINIO_PORT_HOST}` (9000), консоль `${MINIO_CONSOLE_PORT_HOST}` (9001)

### Только инфраструктура

Если нужны только БД, ES и MinIO (backend и frontend запускаете локально):

```bash
docker compose up -d postgres elasticsearch minio
```

Затем настройте `.env` с `DB_HOST=localhost`, `ELASTICSEARCH_URL=http://localhost:9200`, `S3_ENDPOINT=http://localhost:9000` и запускайте backend и frontend вручную (см. [Запуск без Docker](#4-запуск-без-docker)).

---

## 3. Переменные окружения

Файл `.env` в корне проекта. Основные переменные:

### Инфраструктура

| Переменная | Описание | По умолчанию (если есть) |
|------------|----------|---------------------------|
| `NGINX_PORT` | Порт Nginx | — |
| `FRONTEND_PORT` | Порт Vite | 5173 |
| `BACKEND_PORT` | Порт uvicorn | 8000 |
| `BACKEND_URL` | URL backend для сборки frontend | — |

### PostgreSQL

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `DB_HOST` | Хост БД | localhost |
| `DB_PORT` | Порт БД | 5432 |
| `DB_USER` | Пользователь | user |
| `DB_PASS` | Пароль | password |
| `DB_NAME` | Имя БД | db |
| `DB_PORT_HOST` | Порт на хосте (Docker) | — |
| `DATABASE_URL` | Полный URL (переопределяет DB_*) | — |

В Docker Compose формируется `DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASS}@postgres:5432/${DB_NAME}`.

### Elasticsearch

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `ELASTICSEARCH_URL` | URL кластера | http://localhost:9200 |
| `ELASTICSEARCH_PORT` | Порт внутри Docker | — |
| `ELASTICSEARCH_PORT_HOST` | Порт на хосте | — |

### MinIO (S3)

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `S3_ENDPOINT` | URL MinIO | http://localhost:9000 |
| `S3_ACCESS_KEY` | Ключ | minioadmin |
| `S3_SECRET_KEY` | Секрет | minioadmin |
| `S3_BUCKET` | Имя bucket | labportal |
| `S3_PUBLIC_BASE_URL` | Публичный URL для медиа | http://localhost:9000/labportal |
| `MINIO_PORT_HOST` | Порт API на хосте | — |
| `MINIO_CONSOLE_PORT_HOST` | Порт консоли | — |

### Безопасность и интеграции

| Переменная | Описание |
|------------|----------|
| `JWT_SECRET` | Секрет для JWT |
| `ENV` | development \| production |
| `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET` | ORCID OAuth |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Почта (верификация, сброс пароля) |
| `FRONTEND_URL` | Базовый URL фронта для писем и редиректов |
| `CORS_ORIGINS` | Разрешённые CORS-источники (через запятую) |

Для локальной разработки без ORCID и почты достаточно `JWT_SECRET` и базовых настроек. Письма верификации не отправятся, но приложение запустится.

---

## 4. Запуск без Docker

### Backend

1. Запустите PostgreSQL, Elasticsearch и MinIO (вручную или через `docker compose up -d postgres elasticsearch minio`).
2. Создайте виртуальное окружение и установите зависимости:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Настройте `.env` в корне (или экспортируйте переменные).
4. Запустите uvicorn:

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

Таблицы и индексы создаются при старте (см. [База данных](#6-база-данных), [Elasticsearch](#7-elasticsearch)).

### Frontend

1. Установите зависимости:

   ```bash
   cd frontend
   npm install
   ```

2. Запустите dev-сервер:

   ```bash
   npm run dev
   ```

Vite по умолчанию проксирует `/api` на `http://localhost:8000` (см. `vite.config.mts`). Откройте `http://localhost:5173`.

---

## 5. Структура проекта

```
.
├── backend/                 # FastAPI
│   ├── app/
│   │   ├── api/             # Публичные роуты (home, search, profile, storage, analytics)
│   │   ├── core/            # User, Role, auth, users, roles
│   │   ├── jobs/            # Cron-задачи (OpenAlex, подписки)
│   │   ├── middleware/      # StorageUrlRewrite
│   │   ├── roles/           # representative, student, researcher
│   │   ├── services/        # elasticsearch
│   │   ├── storage/         # S3
│   │   ├── bootstrap.py     # create_tables, seed_roles, ensure_storage, ES indexes
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # React + Vite
│   ├── src/
│   │   ├── api/             # client, hooks
│   │   ├── auth/            # AuthContext
│   │   ├── components/      # UI, каталоги, карточки
│   │   ├── pages/           # Страницы, в т.ч. admin
│   │   └── main.jsx, App.jsx
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf.template
├── elasticsearch/
│   └── elasticsearch.yml    # Конфиг ES
├── docker-compose.yml
├── .env                     # Не в git
└── docs/
```

Подробнее: [architecture.md](architecture.md).

---

## 6. База данных

### Миграции

Миграции (Alembic и т.п.) не используются. Схема создаётся при старте backend через SQLAlchemy:

```python
# bootstrap.py
async with async_engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
```

Все модели импортируются через `import app.models` до вызова `create_all`.

### Роли

После создания таблиц выполняется `seed_roles()` — создаются роли, если их ещё нет: `student`, `researcher`, `lab_admin`, `lab_representative`, `platform_admin`.

### Сброс БД

Для полного сброса:

1. Остановите backend.
2. Удалите volume: `docker compose down -v` (осторожно: удалит postgres_data, elasticsearch_data, minio_data) или выполните `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` в PostgreSQL.
3. Перезапустите `docker compose up` — таблицы пересоздадутся, роли заполнятся.

---

## 7. Elasticsearch

### Индексы

Индексы создаются при первом запросе к клиенту ES; при старте backend вызывается `ensure_elasticsearch_indexes()`, который для каждого индекса при необходимости выполняет первичную индексацию:

| Индекс | Сущности |
|--------|----------|
| organizations | Организации |
| laboratories | Лаборатории |
| vacancies | Вакансии |
| queries | Запросы |
| applicants | Соискатели (студенты, исследователи) |

Функции `reindex_*_if_empty()` проверяют, пуст ли индекс; если да — переиндексируют из PostgreSQL.

### Переиндексация вручную

Прямого CLI или скрипта нет. Варианты:

1. **Удалить индекс и перезапустить backend** — индексы пересоздаются, `reindex_*_if_empty` заполнит их заново.
2. **Через Python** — в консоли или скрипте импортировать `reindex_organizations_if_empty` и аналогичные из `app.services.elasticsearch` и вызывать (нужен async run).

### Очистка ES

```bash
curl -X DELETE "http://localhost:9200/organizations"
curl -X DELETE "http://localhost:9200/laboratories"
curl -X DELETE "http://localhost:9200/vacancies"
curl -X DELETE "http://localhost:9200/queries"
curl -X DELETE "http://localhost:9200/applicants"
```

После перезапуска backend индексы будут созданы и заполнены заново.

---

## 8. Линтеры и форматтеры

### Python

В проекте используется **ruff** (`.ruff_cache` в `.gitignore`). Запуск:

```bash
cd backend
ruff check .
ruff format .
```

Конфигурация (если есть) — в `pyproject.toml` или `ruff.toml`. При отсутствии используются значения по умолчанию.

### Frontend

Специальных конфигов ESLint/Prettier в репозитории не обнаружено. При добавлении можно использовать стандартные настройки для React/Vite.

---

## 9. Отладка и логи

### Backend

- Логи в stdout/stderr; при `LOG_FILE_PATH` — дополнительно в файл (в Docker: `./logs/app.log`).
- `LOG_LEVEL`: `DEBUG`, `INFO`, `WARNING`, `ERROR`.
- `LOG_FORMAT`: `plain` или `json`.

### Frontend

Vite выводит логи в консоль. HMR включён — изменения применяются без полной перезагрузки.

### Health-check

- Backend: `GET http://localhost:8000/health` — доступен при прямом обращении к backend (без Nginx).
- Через Nginx маршрут `/health` не настроен и уходит во frontend. Docker healthcheck обращается к backend напрямую внутри контейнера.

### Частые проблемы

| Проблема | Решение |
|----------|---------|
| 401 на /api | Проверить JWT, localStorage (labconnect_auth) |
| Пустые каталоги | Дождаться индексации ES при первом запуске (до ~1 мин) |
| CORS | В development автоматически добавляются localhost:5173; при другом origin задать CORS_ORIGINS |
| MinIO 403 | Проверить S3_ACCESS_KEY, S3_SECRET_KEY, bucket labportal |
| ES connection refused | Убедиться, что Elasticsearch запущен и здоров (curl localhost:9200) |

---

## См. также

| Документ | Описание |
|----------|----------|
| [architecture.md](architecture.md) | Архитектура системы |
| [api-public.md](api-public.md) | Публичный API |
| [ENTITIES.md](ENTITIES.md) | Модель данных |
| [admin-panel.md](admin-panel.md) | Панель администратора |
