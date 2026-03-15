import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "../ui";

export default function QueryDetailHero({ details }) {
  const initial = details.title ? details.title.charAt(0).toUpperCase() : "Q";

  return (
    <div className="org-detail-hero">
      <div className="org-detail-hero__media">
        <div className="org-detail-hero__avatar-placeholder" aria-hidden="true">
          {initial}
        </div>
      </div>
      <div className="org-detail-hero__body">
        <h1 className="org-detail-hero__title">{details.title}</h1>
        <div className="org-detail-hero__meta">
          {details.organization && (
            <Link 
              to={`/organizations/${details.organization.public_id}`}
              className="org-detail-hero__link"
            >
              {details.organization.name}
            </Link>
          )}
          {details.research_direction && (
            <span className="org-detail-hero__meta-item">{details.research_direction}</span>
          )}
        </div>
        {details.task_description && (
          <p className="org-detail-hero__description">{details.task_description}</p>
        )}
      </div>
    </div>
  );
}
