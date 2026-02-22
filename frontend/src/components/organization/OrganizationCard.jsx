import React from "react";
import WebsiteLink from "../WebsiteLink";

export default function OrganizationCard({ org, onOpen }) {
  const hasLink = !!org.public_id;

  return (
    <article
      className="org-card-modern"
      onClick={() => hasLink && onOpen(org.public_id)}
      role={hasLink ? "button" : undefined}
      tabIndex={hasLink ? 0 : undefined}
      onKeyDown={(e) => {
        if (hasLink && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(org.public_id);
        }
      }}
    >
      <div className="org-card-modern__media">
        {org.avatar_url ? (
          <img
            className="org-card-modern__avatar"
            src={org.avatar_url}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="org-card-modern__avatar-placeholder" aria-hidden="true">
            {org.name ? org.name.charAt(0).toUpperCase() : "?"}
          </div>
        )}
      </div>
      <div className="org-card-modern__body">
        <h3 className="org-card-modern__title">{org.name || "Организация"}</h3>
        <div className="org-card-modern__meta">
          {org.address && (
            <span className="org-card-modern__meta-item" title={org.address}>
              {org.address}
            </span>
          )}
          {org.website && (
            <span
              className="org-card-modern__meta-item"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <WebsiteLink url={org.website} className="org-card-modern__link" />
            </span>
          )}
          {!org.address && !org.website && (
            <span className="org-card-modern__meta-item org-card-modern__meta-item--muted">
              Нет контактов
            </span>
          )}
        </div>
        {org.description && (
          <p className="org-card-modern__description" title={org.description}>
            {org.description.length > 140
              ? `${org.description.slice(0, 140)}…`
              : org.description}
          </p>
        )}
        {hasLink && (
          <span className="org-card-modern__cta">
            Открыть профиль
            <span className="org-card-modern__cta-arrow" aria-hidden="true">→</span>
          </span>
        )}
      </div>
    </article>
  );
}
