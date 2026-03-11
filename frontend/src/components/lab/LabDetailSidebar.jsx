import React from "react";
import { Card, Button } from "../ui";

export default function LabDetailSidebar({
  details,
  onHeadClick,
  onOrgClick,
  onSendQuery,
}) {
  const head = details?.head_employee;
  const org = details?.organization;
  const hasQueries = (details?.queries || []).length > 0;

  return (
    <Card variant="elevated" padding="md">
      <div className="detail-sidebar">
        {head && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">Руководитель</span>
            <div
              className="detail-sidebar__head"
              role={onHeadClick ? "button" : undefined}
              tabIndex={onHeadClick ? 0 : undefined}
              onClick={(e) => {
                if (onHeadClick) {
                  e.preventDefault();
                  onHeadClick(head);
                }
              }}
              onKeyDown={(e) => {
                if (onHeadClick && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onHeadClick(head);
                }
              }}
            >
              <span className="detail-sidebar__head-name">{head.full_name}</span>
              {head.academic_degree && (
                <span className="detail-sidebar__head-degree">{head.academic_degree}</span>
              )}
              {onHeadClick && <span className="detail-sidebar__cta">Профиль →</span>}
            </div>
          </div>
        )}

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
            >
              {org.name}
            </span>
          </div>
        )}


        {details?.address && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">Адрес</span>
            <span className="detail-sidebar__text">{details.address}</span>
          </div>
        )}

        <div className="detail-sidebar__actions">
          {hasQueries && (
            <Button
              variant="primary"
              size="default"
              to={details?.queries?.[0]?.public_id ? `/queries/${details.queries[0].public_id}` : undefined}
              onClick={() => onSendQuery?.()}
            >
              Отправить запрос
            </Button>
          )}
          <Button
            variant="secondary"
            size="default"
            onClick={() => {}}
          >
            Связаться
          </Button>
        </div>
      </div>
    </Card>
  );
}
