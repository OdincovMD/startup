import React from "react";

/**
 * Block with icon + label for OrganizationDetailCard content.
 * variant "block": label + children below. variant "meta": label + value inline (for meta-grid).
 */
export default function OrgDetailCardBlock({ icon: Icon, label, value, children }) {
  const labelEl = (
    <span className="org-detail-card__meta-label">
      {Icon && <Icon size={12} className="org-detail-card__meta-icon" />}
      {label}
    </span>
  );
  if (value !== undefined && value !== null) {
    return (
      <div className="org-detail-card__meta-item">
        {labelEl}
        <span className="org-detail-card__meta-value">{value}</span>
      </div>
    );
  }
  return (
    <div className="org-detail-card__block">
      {labelEl}
      {children}
    </div>
  );
}
