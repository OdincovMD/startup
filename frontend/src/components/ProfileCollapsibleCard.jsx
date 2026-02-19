import React, { forwardRef } from "react";

const ProfileCollapsibleCard = forwardRef(({ title, expanded, onToggle, children }, ref) => (
  <div ref={ref} className={`profile-card-collapsible ${expanded ? "expanded" : ""}`}>
      <button
        type="button"
        className="profile-card-header"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {title}
      </button>
    <div className="profile-card-body">{children}</div>
  </div>
));

ProfileCollapsibleCard.displayName = "ProfileCollapsibleCard";
export default ProfileCollapsibleCard;
