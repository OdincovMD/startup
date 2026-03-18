import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building2, Beaker, Calendar } from "lucide-react";
import { Badge, EntityAvatar } from "../ui";

function formatVacancyDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function getFirstLabImage(imageUrls) {
  if (!imageUrls) return null;
  const list = Array.isArray(imageUrls) ? imageUrls : (typeof imageUrls === "string" ? imageUrls.split("\n").map((s) => s.trim()).filter(Boolean) : []);
  return list[0] || null;
}

export default function VacancyDetailHero({ details }) {
  const avatarSrc = details.organization?.avatar_url || getFirstLabImage(details.laboratory?.image_urls);

  return (
    <div className="org-detail-hero">
      <div className="org-detail-hero__media">
        <EntityAvatar src={avatarSrc} alt="" className="org-detail-hero__avatar" />
      </div>
      <div className="org-detail-hero__body">
        <h1 className="org-detail-hero__title">{details.name}</h1>
        <div className="org-detail-hero__meta">
          {details.organization && (
            <Link
              to={`/organizations/${details.organization.public_id}`}
              className="org-detail-hero__meta-item org-detail-hero__meta-item--with-icon org-detail-hero__link"
            >
              <Building2 size={14} className="org-detail-hero__meta-icon" />
              {details.organization.name}
            </Link>
          )}
          {details.laboratory && (
            <Link
              to={`/laboratories/${details.laboratory.public_id}`}
              className="org-detail-hero__meta-item org-detail-hero__meta-item--with-icon org-detail-hero__link"
            >
              <Beaker size={14} className="org-detail-hero__meta-icon" />
              {details.laboratory.name}
            </Link>
          )}
          {details.employment_type && (
            <Badge variant="accent" className="vacancy-detail-chip--type">
              {details.employment_type}
            </Badge>
          )}
          {details.created_at && (
            <span className="org-detail-hero__meta-item org-detail-hero__meta-item--with-icon">
              <Calendar size={14} className="org-detail-hero__meta-icon" />
              Опубликовано {formatVacancyDate(details.created_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
