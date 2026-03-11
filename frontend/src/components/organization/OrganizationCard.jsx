import React, { useState } from "react";
import { Link } from "react-router-dom";
import WebsiteLink from "../WebsiteLink";
import { Card, Button } from "../ui";

const DESCRIPTION_MAX = 140;

export default function OrganizationCard({ org, onOpen }) {
  const [avatarError, setAvatarError] = useState(false);
  const avatarUrl = org.avatar_url;
  const hasLink = !!org.public_id;
  const showAvatar = avatarUrl && !avatarError;
  const displayName = org.name || "Организация";
  const initial = displayName.charAt(0).toUpperCase();
  const description = org.description || "";
  const truncatedDesc = description.length > DESCRIPTION_MAX ? `${description.slice(0, DESCRIPTION_MAX)}…` : description;

  return (
    <Card
      variant="solid"
      as="article"
      padding="md"
      className="org-card-modern org-card-modern--listing"
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
      <div className="org-card-modern__inner org-card-modern__inner--listing">
        <div className="org-card-modern__avatar-wrap">
          {showAvatar ? (
            <img
              className="org-card-modern__avatar"
              src={avatarUrl}
              alt=""
              loading="lazy"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="org-card-modern__avatar-fallback" aria-hidden="true">
              {initial}
            </div>
          )}
        </div>

        <div className="org-card-modern__content">
          <h3 className="org-card-modern__title-wrap">
            {hasLink ? (
              <Link
                to={`/organizations/${org.public_id}`}
                className="org-card-modern__title org-card-modern__title--link"
                onClick={(e) => e.stopPropagation()}
              >
                {displayName}
              </Link>
            ) : (
              <span className="org-card-modern__title">{displayName}</span>
            )}
          </h3>

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

          {truncatedDesc && (
            <p className="org-card-modern__description" title={description}>
              {truncatedDesc}
            </p>
          )}

          {hasLink && (
            <div className="org-card-modern__actions">
              <Button
                variant="ghost"
                size="small"
                to={`/organizations/${org.public_id}`}
                onClick={(e) => e.stopPropagation()}
              >
                Открыть профиль
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
