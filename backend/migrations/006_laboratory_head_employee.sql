-- Руководитель лаборатории: один сотрудник на лабораторию.
-- Один сотрудник может быть руководителем нескольких лабораторий.
ALTER TABLE laboratories_organizations
ADD COLUMN IF NOT EXISTS head_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_laboratories_head_employee ON laboratories_organizations(head_employee_id);
