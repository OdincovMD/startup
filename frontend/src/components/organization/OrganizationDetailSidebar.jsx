import React from "react";
import { Card, Button } from "../ui";
import WebsiteLink from "../WebsiteLink";

export default function OrganizationDetailSidebar({ details }) {
  const hasVacancies = (details?.vacancies || []).length > 0;

  return (
    <Card variant="elevated" padding="md">
      <div className="detail-sidebar">
        {details?.address && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">Адрес</span>
            <span className="detail-sidebar__text">{details.address}</span>
          </div>
        )}

        {details?.website && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">Сайт</span>
            <WebsiteLink url={details.website} className="detail-sidebar__link" />
          </div>
        )}

        <div className="detail-sidebar__stats">
          <span className="detail-sidebar__stat">Лабораторий: {(details?.laboratories || []).length}</span>
          <span className="detail-sidebar__stat">Сотрудников: {(details?.employees || []).length}</span>
          <span className="detail-sidebar__stat">Вакансий: {(details?.vacancies || []).length}</span>
        </div>

        <div className="detail-sidebar__actions">
          <Button variant="primary" size="default">
            Связаться
          </Button>
          {hasVacancies && (
            <Button variant="secondary" size="default" to="/vacancies">
              Вакансии
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
