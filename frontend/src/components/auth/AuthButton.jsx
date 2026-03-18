import React from "react";

export function AuthButton({ 
  children, 
  loading, 
  type = "submit", 
  className = "primary-btn auth-btn-primary", 
  disabled,
  ...props 
}) {
  return (
    <button
      className={className}
      type={type}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <span className="auth-btn-spinner" aria-label="Загрузка">
          <span /><span /><span />
        </span>
      ) : (
        children
      )}
    </button>
  );
}
