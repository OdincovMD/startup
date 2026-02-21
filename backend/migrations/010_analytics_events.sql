-- Аналитика: единая таблица событий (просмотры, уход со страницы, клики).
-- Идемпотентно.

CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(64) NULL,
  entity_type VARCHAR(50) NULL,
  entity_id VARCHAR(32) NULL,
  payload JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_entity ON analytics_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON analytics_events(event_type, created_at);
