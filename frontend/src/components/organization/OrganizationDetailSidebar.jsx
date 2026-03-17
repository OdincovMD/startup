import React from "react";
import { MapPin, Globe, Beaker, Users, Briefcase } from "lucide-react";
import { Card, Button } from "../ui";
import WebsiteLink from "../WebsiteLink";

export default function OrganizationDetailSidebar({ details }) {
  const labsCount = (details?.laboratories || []).length;
  const employeesCount = (details?.employees || []).length;
  const vacanciesCount = (details?.vacancies || []).length;

  return (
    <Card variant="elevated" padding="md">
      <div className="detail-sidebar">
        {details?.address && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">
              <MapPin size={14} className="detail-sidebar__label-icon" />
              Адрес
            </span>
            <span className="detail-sidebar__text">{details.address}</span>
          </div>
        )}

        {details?.website && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">
              <Globe size={14} className="detail-sidebar__label-icon" />
              Сайт
            </span>
            <WebsiteLink url={details.website} className="detail-sidebar__link" />
          </div>
        )}

        <div className="detail-sidebar__stats">
          <span className="detail-sidebar__stat">
            <Beaker size={14} className="detail-sidebar__stat-icon" />
            Лабораторий: {labsCount}
          </span>
          <span className="detail-sidebar__stat">
            <Users size={14} className="detail-sidebar__stat-icon" />
            Сотрудников: {employeesCount}
          </span>
          <span className="detail-sidebar__stat">
            <Briefcase size={14} className="detail-sidebar__stat-icon" />
            Вакансий: {vacanciesCount}
          </span>
        </div>

        <div className="detail-sidebar__actions">
          <Button variant="primary" size="default">
            Связаться
          </Button>
        </div>
      </div>
    </Card>
  );
}
