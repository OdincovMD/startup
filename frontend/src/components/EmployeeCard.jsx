import React from "react";
import { ChevronRight } from "lucide-react";
import { Card } from "./ui/Card";

/**
 * Reusable Employee Card component
 * @param {Object} employee - Employee data object
 * @param {'grid' | 'list'} variant - Layout variant
 * @param {Function} onClick - Click handler
 * @param {string} className - Additional CSS classes
 */
export function EmployeeCard({ 
  employee, 
  variant = "grid", 
  onClick, 
  actions,
  className = "" 
}) {
  if (!employee) return null;

  const positions = (employee.positions || []).join(", ");
  const meta = [employee.academic_degree, positions].filter(Boolean).join(" · ");
  
  const initials = employee.full_name
    ? employee.full_name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?"
    : "?";

  // Deterministic fallback color based on name
  const getFallbackColor = (name) => {
    const colors = [
      "var(--accent-bg)",
      "rgba(74, 85, 104, 0.08)",
      "rgba(26, 35, 50, 0.05)"
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const isList = variant === "list";

  return (
    <Card
      variant="glass"
      padding={isList ? "sm" : "md"}
      className={`employee-card employee-card--${variant} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : "article"}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="employee-card__avatar-container">
        {employee.photo_url ? (
          <img 
            src={employee.photo_url} 
            alt={employee.full_name} 
            className="employee-card__avatar"
          />
        ) : (
          <div 
            className="employee-card__avatar-fallback"
            style={{ backgroundColor: getFallbackColor(employee.full_name) }}
          >
            {initials}
          </div>
        )}
      </div>

      <div className="employee-card__content">
        {isList && !actions && <span className="employee-card__label">Контактное лицо</span>}
        <h3 className="employee-card__name">{employee.full_name}</h3>
        {meta && <p className="employee-card__meta">{meta}</p>}
        {isList && !actions && (
          <span className="employee-card__cta">
            Открыть профиль <ChevronRight size={14} />
          </span>
        )}
        {actions && <div className="employee-card__actions" onClick={e => e.stopPropagation()}>{actions}</div>}
      </div>
    </Card>
  );
}
