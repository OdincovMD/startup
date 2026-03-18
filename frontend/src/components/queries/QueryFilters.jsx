import React from "react";
import { Card, Button } from "../ui";

const QUERY_STATUS_OPTIONS = [
  { value: "", label: "Любой" },
  { value: "active", label: "Активный" },
  { value: "paused", label: "На паузе" },
  { value: "closed", label: "Закрыт" },
];

export function QueryFilters({
  status,
  onStatusChange,
  laboratoryId,
  onLaboratoryChange,
  budgetContains,
  onBudgetChange,
  laboratories = [],
  hasFilters,
  onResetFilters,
}) {
  return (
    <Card variant="solid" padding="sm" role="region" aria-label="Фильтры запросов">
      <div className="vacancy-filters query-filters">
        <div className="vacancy-filters__field">
          <label htmlFor="query-filter-status" className="vacancy-filters__label">
            Статус
          </label>
          <select
            id="query-filter-status"
            className="vacancy-filters__select"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {QUERY_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || "_"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="vacancy-filters__field">
          <label htmlFor="query-filter-lab" className="vacancy-filters__label">
            Лаборатория
          </label>
          <select
            id="query-filter-lab"
            className="vacancy-filters__select"
            value={laboratoryId}
            onChange={(e) => onLaboratoryChange(e.target.value)}
          >
            <option value="">Все лаборатории</option>
            {laboratories.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name}
              </option>
            ))}
          </select>
        </div>

        <div className="vacancy-filters__field">
          <label htmlFor="query-filter-budget" className="vacancy-filters__label">
            Бюджет содержит
          </label>
          <input
            id="query-filter-budget"
            type="text"
            className="vacancy-filters__select"
            placeholder="Например: млн, 500"
            value={budgetContains}
            onChange={(e) => onBudgetChange(e.target.value)}
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
