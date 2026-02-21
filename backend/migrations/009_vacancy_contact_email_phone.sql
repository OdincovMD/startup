-- Вакансии: контакт email и телефон, если не указано контактное лицо (сотрудник).

ALTER TABLE vacancies_organizations
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(100);
