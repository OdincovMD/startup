import React, { useState } from "react";
import { User, ChevronRight } from "lucide-react";

export default function LabDetailHero({ details, labImages, onOrgClick, onHeadClick }) {
  const [avatarError, setAvatarError] = useState(false);
  const images = labImages(details.image_urls);
  const head = details.head_employee;
  const avatarUrl = images[0];
  const showAvatar = avatarUrl && !avatarError;
  const displayName = details.name || "Лаборатория";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="org-detail-hero">
      <div className="org-detail-hero__media">
        {showAvatar ? (
          <img
            className="org-detail-hero__avatar"
            src={avatarUrl}
            alt=""
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className="org-detail-hero__avatar-placeholder" aria-hidden="true">
            {initial}
          </div>
        )}
      </div>
      <div className="org-detail-hero__body">
        <h1 className="org-detail-hero__title">{displayName}</h1>
        <div className="org-detail-hero__meta">
          {details.organization && (
            <span
              className="org-detail-hero__link"
              onClick={(e) => {
                e.stopPropagation();
                if (details.organization?.public_id) onOrgClick(details.organization.public_id);
              }}
              role={details.organization?.public_id ? "button" : undefined}
              tabIndex={details.organization?.public_id ? 0 : undefined}
            >
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
              {head.photo_url ? (
                <img className="org-detail-hero__head-avatar" src={head.photo_url} alt="" />
              ) : (
                <div className="org-detail-hero__head-avatar-placeholder">
                  {head.full_name ? head.full_name.charAt(0).toUpperCase() : "?"}
                </div>
              )}
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
              {onHeadClick && (
                <span className="org-detail-hero__head-cta">
                  Профиль
                  <ChevronRight size={16} strokeWidth={2} aria-hidden />
                </span>
              )}
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
