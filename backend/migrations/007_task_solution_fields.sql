-- Решённые задачи: убрать completed_examples, student_involvement, staff_involvement;
-- добавить сроки решения и грант.

ALTER TABLE task_solutions_organizations
  DROP COLUMN IF EXISTS completed_examples,
  DROP COLUMN IF EXISTS student_involvement,
  DROP COLUMN IF EXISTS staff_involvement;

ALTER TABLE task_solutions_organizations
  ADD COLUMN IF NOT EXISTS solution_deadline TEXT,
  ADD COLUMN IF NOT EXISTS grant_info TEXT;
