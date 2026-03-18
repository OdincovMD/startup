import React from "react";

const VARIANT_CLASSES = {
  glass: "",
  solid: "ui-card--solid",
  elevated: "ui-card--elevated",
};

const PADDING_CLASSES = {
  none: "ui-card--padding-none",
  sm: "ui-card--padding-sm",
  md: "ui-card--padding-md",
  lg: "ui-card--padding-lg",
};

export function Card({
  children,
  variant = "glass",
  as: Component = "div",
  padding = "md",
  className = "",
  ...props
}) {
  const variantClass = VARIANT_CLASSES[variant] ?? "";
  const paddingClass = PADDING_CLASSES[padding] ?? "";
  const classes = ["ui-card", variantClass, paddingClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}
