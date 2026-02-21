import React from "react";

/**
 * Count or label badge in gray/white style.
 */
export default function Badge({ children, className = "", ...rest }) {
  return (
    <span className={`ui-badge ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}
