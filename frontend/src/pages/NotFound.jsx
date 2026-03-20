import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Beaker, FlaskConical, Home, Search } from "lucide-react";
import { Button } from "../components/ui";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    document.title = "Страница не найдена — Синтезум";
  }, []);

  return (
    <main className="main not-found-page">
      <div className="not-found-page__wrap">
        <div className="not-found-page__visual" aria-hidden>
          <div className="not-found-page__flask">
            <FlaskConical size={56} strokeWidth={1.5} />
            <span className="not-found-page__bubbles">
              <span className="not-found-page__bubble" />
              <span className="not-found-page__bubble not-found-page__bubble--2" />
              <span className="not-found-page__bubble not-found-page__bubble--3" />
            </span>
          </div>
          <p className="not-found-page__code">404</p>
        </div>

        <h1 className="not-found-page__title">Образец не найден</h1>
        <p className="not-found-page__lead">
          Мы перебрали все колбы и протоколы — по адресу{" "}
          <code className="not-found-page__path">{location.pathname}</code> ничего
          нет. Возможно, ссылка устарела или в URL закралась опечатка.
        </p>
        <p className="not-found-page__hint">
          <Beaker size={16} className="not-found-page__hint-icon" aria-hidden />
          Совет: начните с главной или воспользуйтесь поиском в шапке.
        </p>

        <div className="not-found-page__actions">
          <Button to="/" variant="primary" size="large">
            <Home size={18} aria-hidden />
            На главную
          </Button>
          <Button to="/vacancies" variant="secondary" size="large">
            <Search size={18} aria-hidden />
            К вакансиям
          </Button>
        </div>

        <nav className="not-found-page__links" aria-label="Полезные разделы">
          <Link to="/laboratories" className="not-found-page__link">
            Лаборатории
          </Link>
          <span className="not-found-page__dot" aria-hidden>
            ·
          </span>
          <Link to="/organizations" className="not-found-page__link">
            Организации
          </Link>
          <span className="not-found-page__dot" aria-hidden>
            ·
          </span>
          <Link to="/queries" className="not-found-page__link">
            Запросы
          </Link>
        </nav>
      </div>
    </main>
  );
}
