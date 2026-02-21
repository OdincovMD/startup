import React from "react";

/**
 * White-theme button. Variants: primary, secondary, ghost.
 * Use className to add utility classes (e.g. for width).
 */
export default function Button({
  variant = "primary",
  type = "button",
  disabled = false,
  className = "",
  children,
  ...rest
}) {
  const base = "ui-btn";
  const variantClass =
    variant === "primary"
      ? "primary-btn"
      : variant === "secondary"
        ? "secondary-btn"
        : "ghost-btn";
  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${variantClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
