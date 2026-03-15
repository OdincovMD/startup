import React from "react";
import { Card, Button } from "../ui";

export function OrgFilters({
  minLaboratories,
  onMinLaboratoriesChange,
  minEmployees,
  onMinEmployeesChange,
  hasFilters,
  onResetFilters,
}) {
  return (
    <Card variant="solid" padding="sm" role="region" aria-label="Фильтры организаций">
      <div className="vacancy-filters org-filters">
        <div className="vacancy-filters__field">
          <label htmlFor="org-filter-min-labs" className="vacancy-filters__label">
            Минимум лабораторий
          </label>
          <input
            id="org-filter-min-labs"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="vacancy-filters__select"
            placeholder="Не менее"
            value={minLaboratories}
            onChange={(e) => onMinLaboratoriesChange(e.target.value.replace(/\D/g, ""))}
            aria-label="Минимум лабораторий"
          />
        </div>

        <div className="vacancy-filters__field">
          <label htmlFor="org-filter-min-employees" className="vacancy-filters__label">
            Минимум сотрудников
          </label>
          <input
            id="org-filter-min-employees"
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
