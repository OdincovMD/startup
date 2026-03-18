import React, { useEffect } from "react";

export function Drawer({ isOpen, onClose, title, children, className = "" }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("ui-drawer-open");
      return () => document.body.classList.remove("ui-drawer-open");
    }
  }, [isOpen]);

  return (
    <div
      className={`ui-drawer ${isOpen ? "ui-drawer--open" : ""} ${className}`.trim()}
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ui-drawer-title"
    >
      <div
        className="ui-drawer__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="ui-drawer__panel">
        <div className="ui-drawer__header">
          <h2 id="ui-drawer-title" className="ui-drawer__title">
            {title}
          </h2>
          <button
            type="button"
            className="ui-drawer__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className="ui-drawer__body">{children}</div>
      </div>
    </div>
  );
}
