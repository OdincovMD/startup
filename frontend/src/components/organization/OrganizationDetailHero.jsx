import React from "react";
import { MapPin, Globe } from "lucide-react";
import WebsiteLink from "../WebsiteLink";
import { EntityAvatar } from "../ui";

export default function OrganizationDetailHero({ details }) {
  const displayName = details.name || "Организация";

  return (
    <div className="org-detail-hero">
      <div className="org-detail-hero__media">
        <EntityAvatar src={details.avatar_url} alt="" className="org-detail-hero__avatar" />
      </div>
      <div className="org-detail-hero__body">
        <h1 className="org-detail-hero__title">{displayName}</h1>
        <div className="org-detail-hero__meta">
          {details.address && (
            <span className="org-detail-hero__meta-item org-detail-hero__meta-item--with-icon">
              <MapPin size={14} className="org-detail-hero__meta-icon" />
              {details.address}
            </span>
          )}
          {details.website && (
            <span
              className="org-detail-hero__meta-item org-detail-hero__meta-item--with-icon"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Globe size={14} className="org-detail-hero__meta-icon" />
              <WebsiteLink url={details.website} className="org-detail-hero__link" />
            </span>
          )}
        </div>
        {details.description && (
          <p className="org-detail-hero__description">{details.description}</p>
        )}
      </div>
    </div>
  );
}
