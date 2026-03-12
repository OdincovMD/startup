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
      padding="none"
      className="modern-entity-card"
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
      <div className="modern-entity-card__media">
        {showAvatar ? (
          <img
            src={avatarUrl}
            alt=""
            loading="lazy"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className="modern-entity-card__fallback" aria-hidden="true">
            {initial}
          </div>
        )}
      </div>

      <div className="modern-entity-card__body">
        <div className="modern-entity-card__info">
          <h3 className="modern-entity-card__title">
            {hasLink ? (
              <Link
                to={`/organizations/${org.public_id}`}
                onClick={(e) => e.stopPropagation()}
              >
                {displayName}
              </Link>
            ) : (
              <span>{displayName}</span>
            )}
          </h3>

          <div className="modern-entity-card__meta">
            {org.address && (
              <span className="modern-entity-card__meta-item" title={org.address}>
                {org.address}
              </span>
            )}
            {org.website && (
              <span
                className="modern-entity-card__meta-item"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <WebsiteLink url={org.website} className="modern-entity-card__link" />
              </span>
            )}
            {!org.address && !org.website && (
              <span className="modern-entity-card__meta-item modern-entity-card__meta-item--muted">
                Нет контактов
              </span>
            )}
          </div>

          {truncatedDesc && (
            <p className="modern-entity-card__desc" title={description}>
              {truncatedDesc}
            </p>
          )}
        </div>

        {hasLink && (
          <div className="modern-entity-card__actions">
            <Button
              variant="ghost"
              size="small"
              to={`/organizations/${org.public_id}`}
              className="nowrap-btn"
              onClick={(e) => e.stopPropagation()}
            >
              В профиль
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
