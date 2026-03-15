import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button } from "../ui";

const ROLE_LABELS = { student: "Студент", researcher: "Исследователь" };
const DESCRIPTION_MAX = 140;

export default function ApplicantCard({ applicant, onOpen }) {
  const [avatarError, setAvatarError] = useState(false);
  const hasLink = !!applicant.public_id;
  const roleLabel = ROLE_LABELS[applicant.role] || applicant.role;
  const displayName = applicant.full_name || "Соискатель";
  const initial = displayName.charAt(0).toUpperCase();
  const summary = applicant.summary || "";
  const truncatedDesc =
    summary.length > DESCRIPTION_MAX ? `${summary.slice(0, DESCRIPTION_MAX)}…` : summary;
  const showAvatar = applicant.photo_url && !avatarError;

  return (
    <Card
      variant="solid"
      as="article"
      padding="none"
      className="modern-entity-card"
      onClick={() => hasLink && onOpen(applicant.public_id)}
      role={hasLink ? "button" : undefined}
      tabIndex={hasLink ? 0 : undefined}
      onKeyDown={(e) => {
        if (hasLink && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(applicant.public_id);
        }
      }}
    >
      <div className="modern-entity-card__media">
        {showAvatar ? (
          <img
            src={applicant.photo_url}
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
                to={`/applicants/${applicant.public_id}`}
                onClick={(e) => e.stopPropagation()}
              >
                {displayName}
              </Link>
            ) : (
              <span>{displayName}</span>
            )}
          </h3>

          {roleLabel && (
            <div className="modern-entity-card__meta">
              <span className="modern-entity-card__meta-item modern-entity-card__meta-item--muted">
                {roleLabel}
              </span>
            </div>
          )}

          {truncatedDesc && (
            <p className="modern-entity-card__desc" title={summary}>
              {truncatedDesc}
            </p>
          )}
        </div>

        {hasLink && (
          <div className="modern-entity-card__actions">
            <Button
              variant="ghost"
              size="small"
              to={`/applicants/${applicant.public_id}`}
              className="nowrap-btn"
              onClick={(e) => e.stopPropagation()}
            >
              Открыть профиль
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
