import React from "react";

export function AuthIconHeader({ icon, title, subtitle, className = "" }) {
  return (
    <div className={`auth-split__form-header ${className}`}>
      {icon && (
        <div className="auth-login-icon-header">
          {typeof icon === "string" && icon.startsWith("http") ? (
            <img src={icon} alt="" width="24" height="24" />
          ) : (
            icon
          )}
          {title && <h1>{title}</h1>}
        </div>
      )}
      {!icon && title && <h1>{title}</h1>}
      {subtitle && <p className="auth-subtitle">{subtitle}</p>}
    </div>
  );
}
