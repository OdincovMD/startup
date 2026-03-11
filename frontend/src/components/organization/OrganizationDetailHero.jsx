import React, { useState } from "react";
import WebsiteLink from "../WebsiteLink";

export default function OrganizationDetailHero({ details }) {
  const [avatarError, setAvatarError] = useState(false);
  const showAvatar = details.avatar_url && !avatarError;
  const displayName = details.name || "Организация";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="org-detail-hero">
      <div className="org-detail-hero__media">
        {showAvatar ? (
          <img
            className="org-detail-hero__avatar"
            src={details.avatar_url}
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
          {details.address && (
            <span className="org-detail-hero__meta-item">{details.address}</span>
          )}
          {details.website && (
            <span
              className="org-detail-hero__meta-item"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <WebsiteLink url={details.website} className="org-detail-hero__link" />
            </span>
          )}
        </div>
        <div className="org-detail-hero__summary">
          <span>Лабораторий: {details.laboratories.length}</span>
          <span>Сотрудников: {details.employees.length}</span>
          <span>Вакансий: {details.vacancies.length}</span>
        </div>
        {details.description && (
          <p className="org-detail-hero__description">{details.description}</p>
        )}
      </div>
    </div>
  );
}
