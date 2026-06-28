# Синтезум

Платформа университетского технологического предпринимательства — маркетплейс организаций, лабораторий, вакансий и научных запросов. Связывает учёных, исследователей и работодателей.

---

## Стек

- **Backend:** FastAPI, PostgreSQL, Elasticsearch, MinIO (S3)
- **Frontend:** React, Vite, React Router v6
- **Роли:** student, researcher, lab_admin, lab_representative, platform_admin

---

## Быстрый старт

**Требования:** Docker 20+, Docker Compose v2+

1. Клонируйте репозиторий.
2. Создайте `.env` в корне проекта (полный список переменных — [docs/development.md](docs/development.md)).
3. Запустите:

```bash
docker compose up --build
```

Приложение доступно по адресу `http://localhost` (если `NGINX_PORT=80`) или `http://localhost:${NGINX_PORT}`.

## Production

Для production-контура используйте отдельный compose-файл:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Перед запуском скопируйте [`.env.production.example`](./.env.production.example) в `.env` и заполните секреты.

Production-сборка:
- фронтенд собирается как статическая статика через `frontend/Dockerfile.prod`
- наружу публикуются только `80` и `443`
- PostgreSQL, Elasticsearch и MinIO остаются внутри docker-сети
- `seed_trial_subscriptions()` отключён на production-запуске

---

## Переменные окружения

Минимально необходимые: `NGINX_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `ELASTICSEARCH_URL` и др. Подробности — в [docs/development.md](docs/development.md#3-переменные-окружения).

---

## Документация

| Документ | Описание |
|----------|----------|
| [docs/development.md](docs/development.md) | Запуск, переменные, структура проекта |
| [docs/architecture.md](docs/architecture.md) | Архитектура системы |
| [docs/api-public.md](docs/api-public.md) | Публичный API |
| [docs/ENTITIES.md](docs/ENTITIES.md) | Модель данных |
| [docs/admin-panel.md](docs/admin-panel.md) | Панель администратора |
| [docs/README.md](docs/README.md) | Полный указатель, включая **бизнес-документы** |
