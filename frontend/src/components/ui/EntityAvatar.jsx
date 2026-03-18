import React, { useState } from "react";
import { DEFAULT_PLACEHOLDER_IMAGE } from "../../constants";

/**
 * Entity avatar with automatic fallback to default placeholder when:
 * - src is empty
 * - image fails to load (onError)
 * Used for: employees, vacancies, queries, organizations, laboratories, applicants.
 */
export function EntityAvatar({ src, alt = "", className, ...imgProps }) {
  const [error, setError] = useState(false);
  const effectiveSrc = (src && !error) ? src : DEFAULT_PLACEHOLDER_IMAGE;

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      className={className}
      onError={() => src && setError(true)}
      {...imgProps}
    />
  );
}
