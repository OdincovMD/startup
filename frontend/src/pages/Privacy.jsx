import React from "react";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <main className="main">
      <section className="section">
        <div className="section-header">
          <h2>Политика конфиденциальности</h2>
          <p>Страница в разработке.</p>
          <Link className="primary-btn" to="/">
            На главную
          </Link>
        </div>
      </section>
    </main>
  );
}
