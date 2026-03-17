import React from "react";
import { Link } from "react-router-dom";
import { HelpCircle, Building2, Layers } from "lucide-react";

export default function QueryDetailHero({ details }) {
  const initial = details.title ? details.title.charAt(0).toUpperCase() : "Q";

  return (
    <div className="org-detail-hero">
      <div className="org-detail-hero__media">
        <div className="org-detail-hero__avatar-placeholder org-detail-hero__avatar-placeholder--query" aria-hidden="true">
          <HelpCircle size={28} className="org-detail-hero__avatar-placeholder-icon" />
          <span>{initial}</span>
        </div>
      </div>
      <div className="org-detail-hero__body">
        <h1 className="org-detail-hero__title">{details.title}</h1>
        <div className="org-detail-hero__meta">
          {details.organization && (
            <Link
              to={`/organizations/${details.organization.public_id}`}
              className="org-detail-hero__meta-item org-detail-hero__meta-item--with-icon org-detail-hero__link"
            >
              <Building2 size={14} className="org-detail-hero__meta-icon" />
              {details.organization.name}
            </Link>
          )}
          {details.research_direction && (
            <span className="org-detail-hero__meta-item org-detail-hero__meta-item--with-icon">
              <Layers size={14} className="org-detail-hero__meta-icon" />
              {details.research_direction}
            </span>
          )}
        </div>
        {details.task_description && (
          <p className="org-detail-hero__description">{details.task_description}</p>
        )}
      </div>
    </div>
  );
}
