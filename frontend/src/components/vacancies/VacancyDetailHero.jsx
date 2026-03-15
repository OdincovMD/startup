import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "../ui";

function formatVacancyDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export default function VacancyDetailHero({ details }) {
  const initial = details.name ? details.name.charAt(0).toUpperCase() : "V";

  return (
    <div className="org-detail-hero">
      <div className="org-detail-hero__media">
        <div className="org-detail-hero__avatar-placeholder vacancy-placeholder" aria-hidden="true">
          {initial}
        </div>
      </div>
      <div className="org-detail-hero__body">
        <h1 className="org-detail-hero__title">{details.name}</h1>
        <div className="org-detail-hero__meta">
          {details.organization && (
            <Link 
              to={`/organizations/${details.organization.public_id}`}
              className="org-detail-hero__link"
            >
              {details.organization.name}
            </Link>
          )}
          {details.laboratory && (
            <Link 
              to={`/laboratories/${details.laboratory.public_id}`}
              className="org-detail-hero__link"
            >
              {details.laboratory.name}
            </Link>
          )}
          {details.employment_type && (
            <Badge variant="accent" className="vacancy-detail-chip--type">
              {details.employment_type}
            </Badge>
          )}
          {details.created_at && (
            <span className="org-detail-hero__meta-item">
              Опубликовано {formatVacancyDate(details.created_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
