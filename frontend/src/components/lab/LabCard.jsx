import React from "react";

export default function LabCard({ lab, labImages, onOpen, onOrgClick, navigate }) {
  const images = labImages(lab.image_urls);
  const hasLink = !!lab.public_id;

  return (
    <article
      className="org-card-modern"
      onClick={() => hasLink && onOpen(lab.public_id)}
      role={hasLink ? "button" : undefined}
      tabIndex={hasLink ? 0 : undefined}
      onKeyDown={(e) => {
        if (hasLink && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(lab.public_id);
        }
      }}
    >
      <div className="org-card-modern__media">
        {images[0] ? (
          <img
            className="org-card-modern__avatar"
            src={images[0]}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="org-card-modern__avatar-placeholder" aria-hidden="true">
            {lab.name ? lab.name.charAt(0).toUpperCase() : "?"}
          </div>
        )}
      </div>
      <div className="org-card-modern__body">
        <h3 className="org-card-modern__title">{lab.name || "Лаборатория"}</h3>
        <div className="org-card-modern__meta">
          {lab.organization && (
            <span
              className="org-card-modern__meta-item"
              onClick={(e) => {
                e.stopPropagation();
                if (lab.organization?.public_id) {
                  navigate(`/organizations/${lab.organization.public_id}`);
                }
              }}
              role={lab.organization?.public_id ? "button" : undefined}
              tabIndex={lab.organization?.public_id ? 0 : undefined}
            >
              {lab.organization.name}
            </span>
          )}
          {!lab.organization && (
            <span className="org-card-modern__meta-item org-card-modern__meta-item--muted">
              Независимая лаборатория
            </span>
          )}
        </div>
        {(lab.description || lab.activities) && (
          <p className="org-card-modern__description" title={lab.description || lab.activities}>
            {lab.description || lab.activities}
          </p>
        )}
        {(lab.employees || []).length > 0 && (
          <div className="org-detail-card__chips org-card-modern__chips">
            {lab.employees.slice(0, 3).map((emp) => (
              <span key={emp.id} className="org-detail-chip">
                {emp.full_name}
              </span>
            ))}
            {lab.employees.length > 3 && (
              <span className="org-detail-chip">+{lab.employees.length - 3}</span>
            )}
          </div>
        )}
        {hasLink && (
          <span className="org-card-modern__cta">
            Открыть лабораторию
            <span className="org-card-modern__cta-arrow" aria-hidden="true">
              →
            </span>
          </span>
        )}
      </div>
    </article>
  );
}
