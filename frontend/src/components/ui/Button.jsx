import React from "react";
import { Link } from "react-router-dom";

const VARIANT_CLASSES = {
  primary: "primary-btn",
  secondary: "secondary-btn",
  ghost: "ghost-btn",
};

export const Button = React.forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "default",
    loading = false,
    disabled = false,
    type = "button",
    className = "",
    to,
    ...props
  },
  ref
) {
  const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary;
  const sizeClass = size === "small" ? "small" : size === "large" ? "large" : "";
  const classes = [variantClass, sizeClass, className].filter(Boolean).join(" ");

  const content = loading ? (
    <span className="auth-btn-spinner" aria-label="Загрузка">
      <span />
      <span />
      <span />
    </span>
  ) : (
    children
  );

  if (to && !loading && !disabled) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      className={classes}
      type={type}
      disabled={loading || disabled}
      {...props}
    >
      {content}
    </button>
  );
});
