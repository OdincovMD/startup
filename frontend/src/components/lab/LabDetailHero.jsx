import React from "react";

export default function LabDetailHero({ details, labImages, onOrgClick, onHeadClick }) {
  const images = labImages(details.image_urls);
  const head = details.head_employee;

  return (
    <div className="org-detail-hero">
      <div className="org-detail-hero__media">
        {images[0] ? (
          <img
            className="org-detail-hero__avatar"
            src={images[0]}
            alt=""
          />
        ) : (
          <div className="org-detail-hero__avatar-placeholder">
            {details.name ? details.name.charAt(0).toUpperCase() : "?"}
          </div>
        )}
      </div>
      <div className="org-detail-hero__body">
        <h1 className="org-detail-hero__title">{details.name}</h1>
        <div className="org-detail-hero__meta">
          {details.organization && (
            <span
              className="org-detail-hero__link"
              onClick={(e) => {
                e.stopPropagation();
                if (details.organization?.public_id) {
                  onOrgClick(details.organization.public_id);
                }
              }}
              role={details.organization?.public_id ? "button" : undefined}
              tabIndex={details.organization?.public_id ? 0 : undefined}
            >
              {details.organization.name}
            </span>
          )}
        </div>
        {head && (
          <>
            <span className="org-detail-hero__head-label">Руководитель лаборатории</span>
          <div
            className="org-detail-hero__head"
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
              {head.academic_degree && (
                <span className="org-detail-hero__head-degree">{head.academic_degree}</span>
              )}
              {(head.positions || []).length > 0 && (
                <span className="org-detail-hero__head-positions">{head.positions.join(", ")}</span>
              )}
              {onHeadClick && <span className="org-detail-hero__head-cta">Профиль →</span>}
            </div>
          </div>
          </>
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
