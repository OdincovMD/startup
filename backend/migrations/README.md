# Миграции БД

## Запуск миграции

Через Docker (если postgres в контейнере `labportal_db`):

```bash
docker exec -i labportal_db psql -U $DB_USER -d $DB_NAME < backend/migrations/001_join_requests_and_notifications.sql
```

Или с явными переменными из `.env`:

```bash
source .env
docker exec -i labportal_db psql -U "$DB_USER" -d "$DB_NAME" < backend/migrations/001_join_requests_and_notifications.sql
```

Локально (если postgres доступен напрямую):

```bash
psql -U your_user -d your_db -f backend/migrations/001_join_requests_and_notifications.sql
```

Миграция идемпотентна — можно запускать повторно без потери данных.
