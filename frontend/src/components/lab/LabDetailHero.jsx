import React from "react";

export default function LabDetailHero({ details, labImages, onOrgClick }) {
  const images = labImages(details.image_urls);

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
