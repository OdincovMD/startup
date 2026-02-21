import React from "react";

/**
 * Base card with optional media and body. White-theme styling.
 * Use media for image/avatar, body for main content.
 */
export default function Card({ media, children, className = "", ...rest }) {
  return (
    <div className={`ui-card ${className}`.trim()} {...rest}>
      {media && <div className="ui-card__media">{media}</div>}
      <div className="ui-card__body">{children}</div>
    </div>
  );
}
