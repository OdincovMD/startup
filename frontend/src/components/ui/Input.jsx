import React from "react";

/**
 * Form input with white-theme styling.
 */
export default function Input({
  type = "text",
  className = "",
  error,
  ...rest
}) {
  return (
    <input
      type={type}
      className={`ui-input ${error ? "error" : ""} ${className}`.trim()}
      aria-invalid={error ? "true" : undefined}
      {...rest}
    />
  );
}
