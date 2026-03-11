import React from "react";
import { Link } from "react-router-dom";
import { Card, Badge, Button } from "../ui";

const EXCERPT_LENGTH = 120;

function getExcerpt(requirements, description) {
  const text = [requirements, description].filter(Boolean).join(" ");
  if (!text.trim()) return "";
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length <= EXCERPT_LENGTH ? trimmed : `${trimmed.slice(0, EXCERPT_LENGTH)}…`;
}

function getLabOrOrgName(vacancy) {
  if (vacancy.laboratory?.name) return vacancy.laboratory.name;
  if (vacancy.organization?.name) return vacancy.organization.name;
  return null;
}

export function VacancyCard({ vacancy, onClick, onKeyDown }) {
  if (!vacancy) return null;

  const isClickable = !!vacancy.public_id;
  const excerpt = getExcerpt(vacancy.requirements, vacancy.description);
  const labOrOrgName = getLabOrOrgName(vacancy);

  return (
    <Card
      variant="solid"
      as="article"
      padding="md"
      className="vacancy-card-modern"
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? onKeyDown : undefined}
    >
      <div className="vacancy-card-modern__header">
        <Link
          to={vacancy.public_id ? `/vacancies/${vacancy.public_id}` : "#"}
          className="vacancy-card-modern__title"
          onClick={(e) => e.stopPropagation()}
        >
          {vacancy.name || "Вакансия"}
        </Link>
      </div>

      {labOrOrgName && (
        <p className="vacancy-card-modern__meta">{labOrOrgName}</p>
      )}

      {excerpt && (
        <p className="vacancy-card-modern__excerpt">{excerpt}</p>
      )}

      <div className="vacancy-card-modern__badges">
        {vacancy.employment_type && (
          <Badge variant="accent">{vacancy.employment_type}</Badge>
        )}
      </div>

      {vacancy.public_id && (
        <div className="vacancy-card-modern__actions">
          <Button
            variant="primary"
            size="small"
            to={`/vacancies/${vacancy.public_id}`}
            onClick={(e) => e.stopPropagation()}
          >
            Откликнуться
          </Button>
          <Button
            variant="ghost"
            size="small"
            to={`/vacancies/${vacancy.public_id}`}
            onClick={(e) => e.stopPropagation()}
          >
            Подробнее
          </Button>
        </div>
      )}
    </Card>
  );
}
