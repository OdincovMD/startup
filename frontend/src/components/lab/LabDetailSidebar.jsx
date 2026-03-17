import React from "react";
import { User, Building2, MapPin } from "lucide-react";
import { Card, Button } from "../ui";

export default function LabDetailSidebar({
  details,
  onHeadClick,
  onOrgClick,
}) {
  const head = details?.head_employee;
  const org = details?.organization;

  return (
    <Card variant="elevated" padding="md">
      <div className="detail-sidebar">
        {head && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">
              <User size={14} className="detail-sidebar__label-icon" />
              Руководитель
            </span>
            <div
              className={`org-detail-hero__head ${onHeadClick ? "org-detail-hero__head--clickable" : ""}`}
              role={onHeadClick ? "button" : undefined}
              tabIndex={onHeadClick ? 0 : undefined}
              onClick={(e) => {
                if (onHeadClick) {
                  e.preventDefault();
                  onHeadClick(head);
                }
              }}
              onKeyDown={(e) => {
                if (onHeadClick && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onHeadClick(head);
                }
              }}
            >
              {head.photo_url ? (
                <img className="org-detail-hero__head-avatar" src={head.photo_url} alt="" />
              ) : (
                <div className="org-detail-hero__head-avatar-placeholder">
                  {head.full_name ? head.full_name.charAt(0).toUpperCase() : "?"}
                </div>
              )}
              <div className="org-detail-hero__head-info">
                <span className="org-detail-hero__head-name">{head.full_name}</span>
                <div className="org-detail-hero__head-meta">
                  {head.academic_degree && (
                    <span className="org-detail-hero__head-degree">{head.academic_degree}</span>
                  )}
                  {(head.positions || []).length > 0 && (
                    <span className="org-detail-hero__head-positions">{head.positions.join(", ")}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {org && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">
              <Building2 size={14} className="detail-sidebar__label-icon" />
              Организация
            </span>
            <span
              className="detail-sidebar__link"
              onClick={(e) => {
                e.stopPropagation();
                if (org.public_id) onOrgClick?.(org.public_id);
              }}
              role={org.public_id ? "button" : undefined}
              tabIndex={org.public_id ? 0 : undefined}
            >
              {org.name}
            </span>
          </div>
        )}


        {details?.address && (
          <div className="detail-sidebar__block">
            <span className="detail-sidebar__label">
              <MapPin size={14} className="detail-sidebar__label-icon" />
              Адрес
            </span>
            <span className="detail-sidebar__text">{details.address}</span>
          </div>
        )}

        <div className="detail-sidebar__actions">
          <Button
            variant="primary"
            size="default"
            onClick={() => {}}
          >
            Связаться
          </Button>
        </div>
      </div>
    </Card>
  );
}
