import React from "react";
import { HelpCircle, Building2, Wallet, CalendarClock, Award, Beaker, Users, Briefcase } from "lucide-react";
import { Card, Badge } from "../ui";

function formatQueryDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

const QUERY_STATUS_LABELS = { active: "Открыт", paused: "На паузе", closed: "Закрыт" };

export default function QueryDetailSidebar({ details, onOrgClick }) {
  if (!details) return null;

  const org = details.organization;

  return (
    <Card variant="elevated" padding="md">
      <div className="detail-sidebar">
        {details.status && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">
              <HelpCircle size={14} className="detail-sidebar__label-icon" />
              Статус
            </span>
            <Badge
              variant={
                details.status === "active"
                  ? "success"
                  : details.status === "closed"
                    ? "default"
                    : "default"
              }
              style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}
            >
              {QUERY_STATUS_LABELS[details.status] ?? details.status}
            </Badge>
          </div>
        )}

        {org && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">
              <Building2 size={14} className="detail-sidebar__label-icon" />
              Организация
            </span>
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

        {details.budget && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">
              <Wallet size={14} className="detail-sidebar__label-icon" />
              Бюджет
            </span>
            <span className="detail-sidebar__text" style={{ fontWeight: 600 }}>{details.budget}</span>
          </div>
        )}

        {details.deadline && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">
              <CalendarClock size={14} className="detail-sidebar__label-icon" />
              Дедлайн
            </span>
            <span className="detail-sidebar__text">
              {formatQueryDate(details.deadline)}
            </span>
          </div>
        )}

        {details.grant_info && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">
              <Award size={14} className="detail-sidebar__label-icon" />
              Грант
            </span>
            <span className="detail-sidebar__text">{details.grant_info}</span>
          </div>
        )}

        <div className="detail-sidebar__stats">
          {(details.laboratories || []).length > 0 && (
            <span className="detail-sidebar__stat">
              <Beaker size={14} className="detail-sidebar__stat-icon" />
              Лабораторий: {(details.laboratories || []).length}
            </span>
          )}
          {(details.employees || []).length > 0 && (
            <span className="detail-sidebar__stat">
              <Users size={14} className="detail-sidebar__stat-icon" />
              Сотрудников: {(details.employees || []).length}
            </span>
          )}
          {(details.vacancies || []).length > 0 && (
            <span className="detail-sidebar__stat">
              <Briefcase size={14} className="detail-sidebar__stat-icon" />
              Вакансий: {(details.vacancies || []).length}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
