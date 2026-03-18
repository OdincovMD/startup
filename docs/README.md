# Документация — Синтезум

Платформа университетского технологического предпринимательства. Документы описывают архитектуру, сущности и API.

---

## Содержание

| Документ | Описание |
|----------|----------|
| [ENTITIES.md](ENTITIES.md) | Сущности базы данных, связи, роли и профили |
| [subscription-ranking.md](subscription-ranking.md) | Подписки и ранжирование — продуктовая спецификация |
| [admin-panel.md](admin-panel.md) | Панель администратора — API, доступ, структура |

---

## Кратко о проекте

- **Backend:** FastAPI, PostgreSQL, Elasticsearch, MinIO (S3)
- **Frontend:** React, Vite, React Router v6
- **Роли:** student, researcher, lab_admin, lab_representative, platform_admin
- **API prefix:** `/api` (включая `/api/admin` для панели админа)
