import React from "react";
import { Card } from "../ui";

function formatQueryDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

const QUERY_STATUS_LABELS = { active: "Активный", paused: "На паузе", closed: "Закрыт" };

export default function QueryDetailSidebar({ details, onOrgClick }) {
  if (!details) return null;

  const org = details.organization;

  return (
    <Card variant="elevated" padding="md">
      <div className="detail-sidebar">
        {org && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">Организация</span>
            <span
              className="detail-sidebar__link"
              onClick={(e) => {
                e.stopPropagation();
                if (org.public_id) onOrgClick?.(org.public_id);
              }}
              role={org.public_id ? "button" : undefined}
              tabIndex={org.public_id ? 0 : undefined}
              onKeyDown={(e) => {
                if (org.public_id && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onOrgClick?.(org.public_id);
                }
              }}
            >
              {org.name}
            </span>
          </div>
        )}

        {details.status && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">Статус</span>
            <span className="detail-sidebar__text">
              {QUERY_STATUS_LABELS[details.status] ?? details.status}
            </span>
          </div>
        )}

        {details.budget && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">Бюджет</span>
            <span className="detail-sidebar__text">{details.budget}</span>
          </div>
        )}

        {details.deadline && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">Дедлайн</span>
            <span className="detail-sidebar__text">
              {formatQueryDate(details.deadline)}
            </span>
          </div>
        )}

        {details.grant_info && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">Грант</span>
            <span className="detail-sidebar__text">{details.grant_info}</span>
          </div>
        )}

        <div className="detail-sidebar__stats">
          {(details.laboratories || []).length > 0 && (
            <span className="detail-sidebar__stat">
              Лабораторий: {(details.laboratories || []).length}
            </span>
          )}
          {(details.employees || []).length > 0 && (
            <span className="detail-sidebar__stat">
              Сотрудников: {(details.employees || []).length}
            </span>
          )}
          {(details.vacancies || []).length > 0 && (
            <span className="detail-sidebar__stat">
              Вакансий: {(details.vacancies || []).length}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
