import React from "react";
import { EyeOpenIcon, EyeOffIcon } from "./AuthIcons";

export function PasswordField({
  id,
  label,
  value,
  onChange,
  showPassword,
  onToggleShow,
  placeholder = "••••••••",
  hint,
  autoComplete = "new-password",
  minLength,
  required = false,
  className = "",
}) {
  return (
    <div className={`field-group ${className}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field-password-wrap">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          minLength={minLength}
          required={required}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="field-password-toggle"
          onClick={onToggleShow}
          aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
          tabIndex={-1}
        >
          {showPassword ? <EyeOffIcon /> : <EyeOpenIcon />}
        </button>
      </div>
      {hint && <span className="auth-hint-inline">{hint}</span>}
    </div>
  );
}
