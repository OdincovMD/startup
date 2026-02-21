import React from "react";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <main className="main">
      <section className="section">
        <div className="section-header">
          <h2>Политика конфиденциальности</h2>
          <p className="section-header__lead">
            На этой странице будет размещён текст политики конфиденциальности сервиса Synthesium.
          </p>
        </div>
        <div className="org-detail-card org-detail-card--standalone">
          <div className="org-detail-card__body">
            <p className="org-detail-card__text org-detail-card__text--muted">
              Раздел в разработке. Мы не передаём ваши персональные данные третьим лицам без согласия и соблюдаем требования законодательства РФ.
            </p>
            <Link className="primary-btn" to="/" style={{ marginTop: "1rem", display: "inline-block" }}>
              На главную
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
