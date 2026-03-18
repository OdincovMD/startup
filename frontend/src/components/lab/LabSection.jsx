import React from "react";

export default function LabSection({ title, badge, emptyMessage, empty, children, icon }) {
  return (
    <div className="org-detail-section">
      <h2 className="org-detail-section__title">
        {icon && <span className="org-detail-section__icon">{icon}</span>}
        {title}
        {badge != null && <span className="org-detail-section__badge">{badge}</span>}
      </h2>
      {empty && <p className="org-detail-section__empty">{emptyMessage}</p>}
      {!empty && children}
    </div>
  );
}
