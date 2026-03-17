import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Globe, Building2, ChevronRight } from "lucide-react";
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
      className="modern-entity-card modern-entity-card--org"
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
          <div className="modern-entity-card__fallback modern-entity-card__fallback--org" aria-hidden="true">
            <Building2 size={32} className="modern-entity-card__fallback-icon" />
            <span className="modern-entity-card__fallback-initial">{initial}</span>
          </div>
        )}
      </div>

      <div className="modern-entity-card__body">
        <div className="modern-entity-card__info">
          <div className="modern-entity-card__title-row">
            <div className="modern-entity-card__title-icon">
              <Building2 size={18} />
            </div>
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
          </div>

          <div className="modern-entity-card__meta modern-entity-card__meta--with-icons">
            {org.address && (
              <div className="modern-entity-card__meta-row" title={org.address}>
                <MapPin size={14} className="modern-entity-card__meta-icon" />
                <span className="modern-entity-card__meta-item modern-entity-card__meta-item--truncate">
                  {org.address}
                </span>
              </div>
            )}
            {org.website && (
              <div
                className="modern-entity-card__meta-row modern-entity-card__meta-row--link"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Globe size={14} className="modern-entity-card__meta-icon" />
                <WebsiteLink url={org.website} className="modern-entity-card__link modern-entity-card__meta-item--truncate" />
              </div>
            )}
            {!org.address && !org.website && (
              <div className="modern-entity-card__meta-row">
                <span className="modern-entity-card__meta-item modern-entity-card__meta-item--muted">
                  Нет контактов
                </span>
              </div>
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
              className="nowrap-btn modern-entity-card__cta-btn"
              onClick={(e) => e.stopPropagation()}
            >
              <span>В профиль</span>
              <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
