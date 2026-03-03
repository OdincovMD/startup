import React from "react";

export default function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-live="polite" aria-label="Загрузка страницы">
      <div className="page-loader__dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="page-loader__text muted">Загрузка…</p>
    </div>
  );
}
