import React from "react";

export default function LabDetailCard({
  children,
  media,
  onMediaClick,
  mediaBadge,
  clickable,
  variant,
  onClick,
  onKeyDown,
}) {
  const classNames = ["org-detail-card"];
  if (clickable) classNames.push("org-detail-card--clickable");
  if (variant === "employee") classNames.push("org-detail-card--employee");
  if (variant === "equipment") classNames.push("org-detail-card--equipment");
  if (variant === "task") classNames.push("org-detail-card--task");
  if (variant === "vacancy") classNames.push("org-detail-card--vacancy");
  if (variant === "query") classNames.push("org-detail-card--query");

  const wrapperProps = clickable
    ? {
        role: "button",
        tabIndex: 0,
        onClick,
        onKeyDown,
        className: classNames.join(" "),
      }
    : { className: classNames.join(" ") };

  return (
    <div {...wrapperProps}>
      {media && (
        onMediaClick ? (
          <button
            type="button"
            className="org-detail-card__media"
            onClick={() => onMediaClick()}
          >
            <img src={media} alt="" />
            {mediaBadge != null && mediaBadge > 0 && (
              <span className="org-detail-card__media-badge">+{mediaBadge}</span>
            )}
          </button>
        ) : (
          <div className="org-detail-card__media">
            <img src={media} alt="" />
          </div>
        )
      )}
      <div className="org-detail-card__body">{children}</div>
    </div>
  );
}
