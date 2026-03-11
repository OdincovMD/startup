import React from "react";
import { Card, Button } from "../ui";

const EMPLOYMENT_TYPES = [
  { value: "", label: "Любой тип занятости" },
  { value: "Полная занятость", label: "Полная занятость" },
  { value: "Частичная занятость", label: "Частичная занятость" },
  { value: "Стажировка", label: "Стажировка" },
  { value: "Вахта", label: "Вахта" },
  { value: "Подработка", label: "Подработка" },
];

export function VacancyFilters({
  employmentType,
  onEmploymentTypeChange,
  organizationId,
  onOrganizationChange,
  laboratoryId,
  onLaboratoryChange,
  organizations,
  laboratories,
  hasFilters,
  onResetFilters,
}) {
  return (
    <Card variant="solid" padding="md" role="region" aria-label="Фильтры">
      <div className="vacancy-filters">
        <div className="vacancy-filters__field">
          <label htmlFor="vacancy-filter-employment" className="vacancy-filters__label">
            Тип занятости
          </label>
          <select
            id="vacancy-filter-employment"
            className="vacancy-filters__select"
            value={employmentType}
            onChange={(e) => onEmploymentTypeChange(e.target.value)}
          >
            {EMPLOYMENT_TYPES.map((opt) => (
              <option key={opt.value || "_"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="vacancy-filters__field">
          <label htmlFor="vacancy-filter-org" className="vacancy-filters__label">
            Организация
          </label>
          <select
            id="vacancy-filter-org"
            className="vacancy-filters__select"
            value={organizationId}
            onChange={(e) => onOrganizationChange(e.target.value)}
          >
            <option value="">Все организации</option>
            {(organizations || []).map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <div className="vacancy-filters__field">
          <label htmlFor="vacancy-filter-lab" className="vacancy-filters__label">
            Лаборатория
          </label>
          <select
            id="vacancy-filter-lab"
            className="vacancy-filters__select"
            value={laboratoryId}
            onChange={(e) => onLaboratoryChange(e.target.value)}
          >
            <option value="">Все лаборатории</option>
            {(laboratories || []).map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name}
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
