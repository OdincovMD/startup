import React from "react";
import { Card, Button } from "../ui";

export function LabFilters({
  organizationId,
  onOrganizationChange,
  withoutOrg,
  onWithoutOrgChange,
  minEmployees,
  onMinEmployeesChange,
  organizations = [],
  hasFilters,
  onResetFilters,
}) {
  return (
    <Card variant="solid" padding="sm" role="region" aria-label="Фильтры лабораторий">
      <div className="vacancy-filters lab-filters">
        <div className="vacancy-filters__field">
          <label htmlFor="lab-filter-org" className="vacancy-filters__label">
            Организация
          </label>
          <select
            id="lab-filter-org"
            className="vacancy-filters__select"
            value={organizationId}
            onChange={(e) => onOrganizationChange(e.target.value)}
          >
            <option value="">Все организации</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <div className="vacancy-filters__field lab-filter-checkbox-wrap">
          <span className="vacancy-filters__label">Независимые</span>
          <label className="lab-filter-checkbox" htmlFor="lab-filter-without-org">
            <input
              id="lab-filter-without-org"
              type="checkbox"
              checked={withoutOrg}
              onChange={(e) => onWithoutOrgChange(e.target.checked)}
              aria-label="Только лаборатории без организации"
            />
            <span className="lab-filter-checkbox__box" aria-hidden="true" />
            <span className="lab-filter-checkbox__label">Без организации</span>
          </label>
        </div>

        <div className="vacancy-filters__field">
          <label htmlFor="lab-filter-min-employees" className="vacancy-filters__label">
            Минимум сотрудников
          </label>
          <input
            id="lab-filter-min-employees"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="vacancy-filters__select"
            placeholder="Не менее"
            value={minEmployees}
            onChange={(e) => onMinEmployeesChange(e.target.value.replace(/\D/g, ""))}
            aria-label="Минимум сотрудников"
          />
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
