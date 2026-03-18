import React from "react";

const VARIANT_CLASSES = {
  default: "",
  success: "ui-badge--success",
  published: "ui-badge--published",
  draft: "ui-badge--draft",
  accepted: "ui-badge--accepted",
  rejected: "ui-badge--rejected",
  accent: "ui-badge--accent",
};

export function Badge({ children, variant = "default", className = "", ...props }) {
  const modifierClass = VARIANT_CLASSES[variant] ?? "";
  const classes = ["ui-badge", modifierClass, className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
