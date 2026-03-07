import React, { lazy, Suspense, useState, useEffect, useRef } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import PageLoader from "../components/PageLoader";

const Home = lazy(() => import("./Home"));
const Login = lazy(() => import("./Login"));
const Register = lazy(() => import("./Register"));
const AuthCallback = lazy(() => import("./AuthCallback"));
const RegisterOrcid = lazy(() => import("./RegisterOrcid"));
const VerifyEmail = lazy(() => import("./VerifyEmail"));
const ForgotPassword = lazy(() => import("./ForgotPassword"));
const ResetPassword = lazy(() => import("./ResetPassword"));
const SetPassword = lazy(() => import("./SetPassword"));
const Profile = lazy(() => import("./Profile"));
const Organizations = lazy(() => import("./Organizations"));
const Laboratories = lazy(() => import("./Laboratories"));
const Queries = lazy(() => import("./Queries"));
const Vacancies = lazy(() => import("./Vacancies"));
const Applicants = lazy(() => import("./Applicants"));
const Privacy = lazy(() => import("./Privacy"));
import NotificationsDropdown from "../components/NotificationsDropdown";
import CookieBanner from "../components/CookieBanner";
import ReleaseBanner from "../components/ReleaseBanner";
import { getOrCreateSessionId, getEntityFromPath, sendEvents } from "../analytics";

const navLinkClass = ({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`;

export default function App() {
  const { auth, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const viewStartRef = useRef(null);
  const lastEntityRef = useRef(null);

  useEffect(() => {
    const { entity_type, entity_id } = getEntityFromPath(location.pathname);
    if (entity_type) {
      viewStartRef.current = Date.now();
      lastEntityRef.current = { entity_type, entity_id };
      const sessionId = getOrCreateSessionId();
      sendEvents([
        {
          event_type: "page_view",
          session_id: sessionId,
          entity_type,
          entity_id: entity_id || undefined,
        },
      ]);
    } else {
      lastEntityRef.current = null;
      viewStartRef.current = null;
    }
  }, [location.pathname]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      const last = lastEntityRef.current;
      const start = viewStartRef.current;
      if (!last || start == null) return;
      const durationSec = Math.round((Date.now() - start) / 1000);
      const sessionId = getOrCreateSessionId();
      sendEvents([
        {
          event_type: "page_leave",
          session_id: sessionId,
          entity_type: last.entity_type,
          entity_id: last.entity_id || undefined,
          payload: { duration_sec: durationSec },
        },
      ]);
      viewStartRef.current = null;
      lastEntityRef.current = null;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
          <Link className="logo" to="/" onClick={closeMenu}>
            Синтезум
          </Link>
          <div className="header__right">
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
            {(auth?.user?.role_name === "lab_admin" || auth?.user?.role_name === "lab_representative") && (
              <NavLink className={navLinkClass} to="/applicants" end={false}>
                Соискатели
              </NavLink>
            )}
            <NavLink className={navLinkClass} to="/" end={true}>
              Главная
            </NavLink>
            {auth ? (
              <div className="nav__user">
                <NotificationsDropdown />
                <NavLink className={navLinkClass} to="/profile">
                  Профиль
                </NavLink>
                <button className="nav-cta nav-cta--ghost" onClick={logout} type="button">
                  Выйти
                </button>
              </div>
            ) : (
              <Link className="nav-cta" to="/login">
                Войти
              </Link>
            )}
            </nav>
            <div className="nav-mobile-actions">
              {auth && (
                <div className="nav-mobile-notifications">
                  <NotificationsDropdown />
                </div>
              )}
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
          </div>
        </div>
        <div
          id="nav-drawer"
          className={`nav-drawer ${menuOpen ? "nav-drawer--open" : ""}`}
          aria-hidden={!menuOpen}
        >
          <div className="nav-drawer__backdrop" onClick={closeMenu} aria-hidden="true" />
          <div className="nav-drawer__panel">
            <div className="nav-drawer__header">
              <div className="nav-drawer__brand">Синтезум</div>
              <button
                type="button"
                className="nav-drawer__close"
                onClick={closeMenu}
                aria-label="Закрыть меню"
              >
                ×
              </button>
            </div>
            <div className="nav-drawer__links">
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
              {(auth?.user?.role_name === "lab_admin" || auth?.user?.role_name === "lab_representative") && (
                <NavLink className={navLinkClass} to="/applicants" end={false} onClick={closeMenu}>
                  Соискатели
                </NavLink>
              )}
              {auth ? (
                <div className="nav-drawer__user">
                  <NavLink className={navLinkClass} to="/profile" onClick={closeMenu}>
                    Профиль
                  </NavLink>
                  <button
                    className="nav-cta nav-cta--ghost nav-drawer__cta"
                    onClick={() => {
                      closeMenu();
                      logout();
                    }}
                    type="button"
                  >
                    Выйти
                  </button>
                </div>
              ) : (
                <Link className="nav-cta nav-drawer__cta" to="/login" onClick={closeMenu}>
                  Войти
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="main-wrapper">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/register/orcid" element={<RegisterOrcid />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/organizations/:publicId" element={<Organizations />} />
            <Route path="/laboratories" element={<Laboratories />} />
            <Route path="/laboratories/:publicId" element={<Laboratories />} />
            <Route path="/queries" element={<Queries />} />
            <Route path="/queries/:publicId" element={<Queries />} />
            <Route path="/vacancies" element={<Vacancies />} />
            <Route path="/vacancies/:publicId" element={<Vacancies />} />
            <Route path="/applicants" element={<Applicants />} />
            <Route path="/applicants/:publicId" element={<Applicants />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </Suspense>
      </div>

      <CookieBanner />
      <ReleaseBanner />

      <footer className="footer">
        <div className="footer__content">
          <div className="footer__brand">Синтезум</div>
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
            <NavLink className={({ isActive }) => `footer__link${isActive ? " footer__link--active" : ""}`} to="/privacy">
              Политика конфиденциальности
            </NavLink>
          </div>
        </div>
        <div className="footer__copy">© 2026 Синтезум</div>
      </footer>
    </div>
  );
}

