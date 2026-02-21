-- Запросы организации: убрать ссылки на статьи, добавить поле «Грант».

ALTER TABLE organization_queries
  DROP COLUMN IF EXISTS article_links;

ALTER TABLE organization_queries
  ADD COLUMN IF NOT EXISTS grant_info TEXT;
