import React from "react";
import { Card, Button } from "../ui";

const ROLE_OPTIONS = [
  { value: "", label: "Все" },
  { value: "student", label: "Студент" },
  { value: "researcher", label: "Исследователь" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Любой статус" },
  { value: "Практика", label: "Практика" },
  { value: "Трудоустройство", label: "Трудоустройство" },
  { value: "Стажировка", label: "Стажировка" },
  { value: "active", label: "Активно ищу работу" },
  { value: "passive", label: "Рассматриваю предложения" },
  { value: "not_active", label: "Не ищу работу" },
];

export function ApplicantFilters({
  roleFilter,
  onRoleChange,
  statusFilter,
  onStatusChange,
  hasFilters,
  onResetFilters,
}) {
  return (
    <Card variant="solid" padding="sm" role="region" aria-label="Фильтры соискателей">
      <div className="vacancy-filters">
        <div className="vacancy-filters__field">
          <label htmlFor="applicant-filter-role" className="vacancy-filters__label">
            Роль
          </label>
          <select
            id="applicant-filter-role"
            className="vacancy-filters__select"
            value={roleFilter}
            onChange={(e) => onRoleChange(e.target.value)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value || "_"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="vacancy-filters__field">
          <label htmlFor="applicant-filter-status" className="vacancy-filters__label">
            Статус
          </label>
          <select
            id="applicant-filter-status"
            className="vacancy-filters__select"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || "_"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <Button variant="ghost" onClick={onResetFilters} className="vacancy-filters__reset">
            Сбросить фильтры
          </Button>
        )}
      </div>
    </Card>
  );
}
