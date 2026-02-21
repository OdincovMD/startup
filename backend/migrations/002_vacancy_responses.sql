-- Миграция: отклики на вакансии (Vacancy responses)
-- Безопасно для повторного запуска (idempotent)

CREATE TABLE IF NOT EXISTS vacancy_responses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vacancy_id INTEGER NOT NULL REFERENCES vacancies_organizations(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL,
  CONSTRAINT uq_vacancy_response_user_vacancy UNIQUE (user_id, vacancy_id)
);

CREATE INDEX IF NOT EXISTS idx_vacancy_response_user ON vacancy_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_vacancy_response_vacancy ON vacancy_responses(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_vacancy_response_status ON vacancy_responses(status);
