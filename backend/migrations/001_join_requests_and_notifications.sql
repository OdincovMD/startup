-- Миграция: Join Requests и уведомления
-- Безопасно для повторного запуска (idempotent)

-- 1. Добавить колонку read_at в notifications (если таблица уже есть)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'notifications' AND column_name = 'read_at'
    ) THEN
      ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP WITH TIME ZONE NULL;
    END IF;
  END IF;
END $$;

-- 2. Создать таблицу lab_join_requests
CREATE TABLE IF NOT EXISTS lab_join_requests (
  id SERIAL PRIMARY KEY,
  researcher_id INTEGER NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
  laboratory_id INTEGER NOT NULL REFERENCES laboratories_organizations(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL,
  CONSTRAINT uq_lab_join_researcher_lab UNIQUE (researcher_id, laboratory_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_join_researcher ON lab_join_requests(researcher_id);
CREATE INDEX IF NOT EXISTS idx_lab_join_laboratory ON lab_join_requests(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_lab_join_status ON lab_join_requests(status);

-- 3. Создать таблицу org_join_requests
CREATE TABLE IF NOT EXISTS org_join_requests (
  id SERIAL PRIMARY KEY,
  laboratory_id INTEGER NOT NULL REFERENCES laboratories_organizations(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL,
  CONSTRAINT uq_org_join_lab_org UNIQUE (laboratory_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_join_laboratory ON org_join_requests(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_org_join_organization ON org_join_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_join_status ON org_join_requests(status);

-- 4. Таблица researcher_laboratories (связь Исследователь↔Лаборатория)
CREATE TABLE IF NOT EXISTS researcher_laboratories (
  researcher_id INTEGER NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
  laboratory_id INTEGER NOT NULL REFERENCES laboratories_organizations(id) ON DELETE CASCADE,
  PRIMARY KEY (researcher_id, laboratory_id)
);
