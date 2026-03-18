import React from "react";
import { Link } from "react-router-dom";
import { HelpCircle, Building2, Layers } from "lucide-react";
import { EntityAvatar } from "../ui";

export default function QueryDetailHero({ details }) {
  const avatarSrc = details.organization?.avatar_url || (details.laboratory?.image_urls?.[0] ?? null);

  return (
    <div className="org-detail-hero">
      <div className="org-detail-hero__media">
        <EntityAvatar src={avatarSrc} alt="" className="org-detail-hero__avatar" />
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
