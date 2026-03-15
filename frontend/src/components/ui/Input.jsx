import React from "react";

export const Input = React.forwardRef(function Input(
  { id, label, error, hint, icon, className = "", ...rest },
  ref
) {
  const errorId = id ? `${id}-error` : undefined;
  const hintId = id ? `${id}-hint` : undefined;
  const describedBy = [error && errorId, hint && !error && hintId]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={`ui-input-group ${className}`.trim()}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className={`ui-input-wrapper ${icon ? "with-icon" : ""}`.trim()}>
        {icon && <span className="ui-input-icon">{icon}</span>}
        <input
          ref={ref}
          id={id}
          className={`ui-input ${error ? "error" : ""}`.trim()}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...rest}
        />
      </div>
      {error && (
        <span id={errorId} className="ui-input-error">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={hintId} className="ui-input-hint">
          {hint}
        </span>
      )}
    </div>
  );
});
