import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, Badge, Button } from "../ui";

const DESCRIPTION_MAX = 140;

export default function LabCard({ lab, labImages, onOpen, navigate }) {
  const [avatarError, setAvatarError] = useState(false);
  const images = labImages ? labImages(lab.image_urls) : [];
  const avatarUrl = images[0];
  const hasLink = !!lab.public_id;
  const showAvatar = avatarUrl && !avatarError;
  const displayName = lab.name || "Лаборатория";
  const initial = displayName.charAt(0).toUpperCase();
  const description = lab.description || lab.activities || "";
  const truncatedDesc = description.length > DESCRIPTION_MAX ? `${description.slice(0, DESCRIPTION_MAX)}…` : description;

  return (
    <Card
      variant="solid"
      as="article"
      padding="md"
      className="lab-card-modern"
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
      <div className="lab-card-modern__inner">
        <div className="lab-card-modern__avatar-wrap">
          {showAvatar ? (
            <img
              className="lab-card-modern__avatar"
              src={avatarUrl}
              alt=""
              loading="lazy"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="lab-card-modern__avatar-fallback" aria-hidden="true">
              {initial}
            </div>
          )}
        </div>

        <div className="lab-card-modern__content">
          <h3 className="lab-card-modern__title-wrap">
            {hasLink ? (
              <Link
                to={`/laboratories/${lab.public_id}`}
                className="lab-card-modern__title"
                onClick={(e) => e.stopPropagation()}
              >
                {displayName}
              </Link>
            ) : (
              <span className="lab-card-modern__title lab-card-modern__title--plain">{displayName}</span>
            )}
          </h3>

          <div className="lab-card-modern__meta">
            {lab.organization ? (
              <span
                className="lab-card-modern__meta-item lab-card-modern__meta-item--link"
                onClick={(e) => {
                  e.stopPropagation();
                  if (lab.organization?.public_id) navigate(`/organizations/${lab.organization.public_id}`);
                }}
                role={lab.organization?.public_id ? "button" : undefined}
                tabIndex={lab.organization?.public_id ? 0 : undefined}
                onKeyDown={(e) => {
                  if (lab.organization?.public_id && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/organizations/${lab.organization.public_id}`);
                  }
                }}
              >
                {lab.organization.name}
              </span>
            ) : (
              <span className="lab-card-modern__meta-item lab-card-modern__meta-item--muted">
                Независимая лаборатория
              </span>
            )}
            {lab.head_employee && (
              <span className="lab-card-modern__meta-item lab-card-modern__meta-item--head">
                Руководитель: {lab.head_employee.full_name}
              </span>
            )}
          </div>

          {truncatedDesc && (
            <p className="lab-card-modern__description" title={description}>
              {truncatedDesc}
            </p>
          )}

          {(lab.employees || []).length > 0 && (
            <div className="lab-card-modern__badges">
              {lab.employees.slice(0, 3).map((emp) => (
                <Badge key={emp.id} variant="default">
                  {emp.full_name}
                </Badge>
              ))}
              {lab.employees.length > 3 && <Badge variant="default">+{lab.employees.length - 3}</Badge>}
            </div>
          )}

          {hasLink && (
            <div className="lab-card-modern__actions">
              <Button
                variant="ghost"
                size="small"
                to={`/laboratories/${lab.public_id}`}
                onClick={(e) => e.stopPropagation()}
              >
                Открыть лабораторию
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
