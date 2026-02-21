import React, { useState, useEffect } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Register from "./Register";
import AuthCallback from "./AuthCallback";
import RegisterOrcid from "./RegisterOrcid";
import Profile from "./Profile";
import Organizations from "./Organizations";
import Laboratories from "./Laboratories";
import Queries from "./Queries";
import Vacancies from "./Vacancies";
import Privacy from "./Privacy";
import { useAuth } from "../auth/AuthContext";
import NotificationsDropdown from "../components/NotificationsDropdown";

const navLinkClass = ({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`;

export default function App() {
  const { auth, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    if (menuOpen) {
      document.body.classList.add("nav-open");
      window.addEventListener("resize", close);
      return () => {
        document.body.classList.remove("nav-open");
        window.removeEventListener("resize", close);
      };
    }
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <Link className="logo" to="/" onClick={closeMenu}>Synthesium</Link>
          <nav className="nav" aria-label="Основное меню">
            <NavLink className={navLinkClass} to="/laboratories" end={false}>
              Лаборатории
            </NavLink>
            <NavLink className={navLinkClass} to="/organizations" end={false}>
              Организации
            </NavLink>
            <NavLink className={navLinkClass} to="/queries" end={false}>
              Запросы
            </NavLink>
            <NavLink className={navLinkClass} to="/vacancies" end={false}>
              Вакансии
            </NavLink>
            <NavLink className={navLinkClass} to="/" end={true}>
              Главная
            </NavLink>
            {auth ? (
              <>
                <NotificationsDropdown />
                <NavLink className={navLinkClass} to="/profile">
                  Профиль
                </NavLink>
                <button className="nav-cta" onClick={logout} type="button">
                  Выйти
                </button>
              </>
            ) : (
              <Link className="nav-cta" to="/login">
                Войти
              </Link>
            )}
          </nav>
          <button
            type="button"
            className="nav-burger"
            aria-expanded={menuOpen}
            aria-controls="nav-drawer"
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="nav-burger__line" />
            <span className="nav-burger__line" />
            <span className="nav-burger__line" />
          </button>
        </div>
        <div
          id="nav-drawer"
          className={`nav-drawer ${menuOpen ? "nav-drawer--open" : ""}`}
          aria-hidden={!menuOpen}
        >
          <div className="nav-drawer__backdrop" onClick={closeMenu} aria-hidden="true" />
          <div className="nav-drawer__panel">
            <NavLink className={navLinkClass} to="/" end={true} onClick={closeMenu}>
              Главная
            </NavLink>
            <NavLink className={navLinkClass} to="/laboratories" end={false} onClick={closeMenu}>
              Лаборатории
            </NavLink>
            <NavLink className={navLinkClass} to="/organizations" end={false} onClick={closeMenu}>
              Организации
            </NavLink>
            <NavLink className={navLinkClass} to="/queries" end={false} onClick={closeMenu}>
              Запросы
            </NavLink>
            <NavLink className={navLinkClass} to="/vacancies" end={false} onClick={closeMenu}>
              Вакансии
            </NavLink>
            {auth ? (
              <>
                <NavLink className={navLinkClass} to="/profile" onClick={closeMenu}>
                  Профиль
                </NavLink>
                <button className="nav-cta nav-drawer__cta" onClick={() => { closeMenu(); logout(); }} type="button">
                  Выйти
                </button>
              </>
            ) : (
              <Link className="nav-cta nav-drawer__cta" to="/login" onClick={closeMenu}>
                Войти
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="main-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/register/orcid" element={<RegisterOrcid />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/organizations/:publicId" element={<Organizations />} />
          <Route path="/laboratories" element={<Laboratories />} />
          <Route path="/laboratories/:publicId" element={<Laboratories />} />
          <Route path="/queries" element={<Queries />} />
          <Route path="/queries/:publicId" element={<Queries />} />
          <Route path="/vacancies" element={<Vacancies />} />
          <Route path="/vacancies/:publicId" element={<Vacancies />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </div>

      <footer className="footer">
        <div className="footer__content">
          <div className="footer__brand">Synthesium</div>
          <p className="footer__grant">
            Проект реализован при поддержке Фонда содействия инновациям в рамках программы «Студенческий
            стартап» мероприятия «Платформа университетского технологического предпринимательства»
            федерального проекта «Технологическое предпринимательство».
          </p>
          <div className="footer__contacts">
            <div className="footer__contacts-title">Контакты</div>
            <address className="footer__address">
              Москва, Борисовские пруды, 14к4, 34
              <br />
              Тел.: <a href="tel:+79299873125">+7 929 987-31-25</a>
              <br />
              Почта: <a href="mailto:info@sintezum.ru">info@sintezum.ru</a>
            </address>
          </div>
          <div className="footer__nav">
            <NavLink className={({ isActive }) => `footer__link${isActive ? " footer__link--active" : ""}`} to="/">
              Главная
            </NavLink>
            <NavLink className={({ isActive }) => `footer__link${isActive ? " footer__link--active" : ""}`} to="/laboratories" end={false}>
              Лаборатории
            </NavLink>
            <NavLink className={({ isActive }) => `footer__link${isActive ? " footer__link--active" : ""}`} to="/organizations" end={false}>
              Организации
            </NavLink>
            <NavLink className={({ isActive }) => `footer__link${isActive ? " footer__link--active" : ""}`} to="/queries" end={false}>
              Запросы
            </NavLink>
            <NavLink className={({ isActive }) => `footer__link${isActive ? " footer__link--active" : ""}`} to="/vacancies" end={false}>
              Вакансии
            </NavLink>
            <NavLink className={({ isActive }) => `footer__link${isActive ? " footer__link--active" : ""}`} to="/privacy">
              Политика конфиденциальности
            </NavLink>
          </div>
        </div>
        <div className="footer__copy">© 2026 Synthesium</div>
      </footer>
    </div>
  );
}

