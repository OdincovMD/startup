import React from "react";
import { Card, Button } from "../ui";
import { EmployeeCard } from "../EmployeeCard";

export default function LabDetailSidebar({
  details,
  onHeadClick,
  onOrgClick,
}) {
  const head = details?.head_employee;
  const org = details?.organization;

  return (
    <Card variant="elevated" padding="md">
      <div className="detail-sidebar">
        {head && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">Руководитель</span>
            <EmployeeCard
              variant="list"
              employee={head}
              onClick={onHeadClick ? () => onHeadClick(head) : undefined}
              listLabel=""
            />
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
          <Button
            variant="primary"
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
