import React from "react";
import { User, Building2 } from "lucide-react";
import { EntityAvatar } from "../ui";

export default function LabDetailHero({ details, labImages, onOrgClick, onHeadClick }) {
  const images = labImages(details.image_urls);
  const head = details.head_employee;
  const avatarUrl = images[0];
  const displayName = details.name || "Лаборатория";

  return (
    <div className="org-detail-hero">
      <div className="org-detail-hero__media">
        <EntityAvatar src={avatarUrl} alt="" className="org-detail-hero__avatar" />
      </div>
      <div className="org-detail-hero__body">
        <h1 className="org-detail-hero__title">{displayName}</h1>
        <div className="org-detail-hero__meta">
          {details.organization && (
            <span
              className="org-detail-hero__meta-item org-detail-hero__meta-item--with-icon org-detail-hero__link"
              onClick={(e) => {
                e.stopPropagation();
                if (details.organization?.public_id) onOrgClick(details.organization.public_id);
              }}
              role={details.organization?.public_id ? "button" : undefined}
              tabIndex={details.organization?.public_id ? 0 : undefined}
            >
              <Building2 size={14} className="org-detail-hero__meta-icon" />
              {details.organization.name}
            </span>
          )}
        </div>
        {head && (
          <div className="org-detail-hero__head-wrap">
            <span className="org-detail-hero__head-label">
              <User size={12} strokeWidth={2.5} aria-hidden />
              Руководитель лаборатории
            </span>
            <div
              className={`org-detail-hero__head ${onHeadClick ? "org-detail-hero__head--clickable" : ""}`}
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
              <EntityAvatar src={head.photo_url} alt="" className="org-detail-hero__head-avatar" />
              <div className="org-detail-hero__head-info">
                <span className="org-detail-hero__head-name">{head.full_name}</span>
                <div className="org-detail-hero__head-meta">
                  {head.academic_degree && (
                    <span className="org-detail-hero__head-degree">{head.academic_degree}</span>
                  )}
                  {(head.positions || []).length > 0 && (
                    <span className="org-detail-hero__head-positions">{head.positions.join(", ")}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {details.description && (
          <p className="org-detail-hero__description">{details.description}</p>
        )}
        {details.activities && (
          <p className="org-detail-hero__description">{details.activities}</p>
        )}
      </div>
    </div>
  );
}
