import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import GlobalSearch from "../components/GlobalSearch";
import FeaturedCarousel from "../components/FeaturedCarousel";

const FALLBACK_DIRECTIONS = [
  "AI", "Biomed", "Physics", "Climate", "Genomics", "Robotics",
  "Materials", "Neuroscience", "Quantum", "Chemistry", "Bioinformatics",
  "Machine Learning", "Synthetic Biology", "Nanotech", "Energy",
];
/** Склонение для русского: 1 — одна форма, 2–4 — вторая, 0/5+ — третья (11–14 тоже третья). */
function pluralRu(n, one, few, many) {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod100 !== 11 && mod10 === 1) return one;
  if (mod100 < 12 || mod100 > 14) {
    if (mod10 >= 2 && mod10 <= 4) return few;
  }
  return many;
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function getMetricLabelLaboratories(n) {
  const word = pluralRu(n, "лаборатория", "лаборатории", "лабораторий");
  return `${cap(word)} на платформе`;
}
function getMetricLabelVacancies(n) {
  return cap(pluralRu(n, "открытая позиция", "открытые позиции", "открытых позиций"));
}
function getMetricLabelResponses(n) {
  return cap(pluralRu(n, "отклик отправлен", "отклика отправлено", "откликов отправлено"));
}

function formatVacancyDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function parseVacancySkills(requirements, description) {
  const text = [requirements, description].filter(Boolean).join(" ");
  if (!text.trim()) return [];
  const parts = text
    .split(/[,;\n·]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 40);
  return [...new Set(parts)].slice(0, 6);
}

const IMG_EXT = /\.(jpe?g|png|gif|webp|avif)(\?|$)/i;

function labImages(urls) {
  const list = Array.isArray(urls) ? urls : [];
  return list.filter((u) => u && IMG_EXT.test(u));
}

export default function Home() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [featuredJson, statsJson] = await Promise.all([
          apiRequest("/home/featured"),
          apiRequest("/stats/").catch(() => null),
        ]);
        setOrgs(featuredJson?.organizations ?? []);
        setLaboratories(featuredJson?.laboratories ?? []);
        setVacancies(featuredJson?.vacancies ?? []);
        setStats(statsJson);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [auth]);

  const formatMetric = (val) => {
    if (val == null || val === 0) return "0";
    if (val >= 1000) return `${Math.floor(val / 1000)}k+`;
    if (val >= 100) return `${val}+`;
    return String(val);
  };

  const featuredOrgs = useMemo(() => orgs, [orgs]);
  const featuredLabs = useMemo(() => laboratories, [laboratories]);
  const featuredVacancies = useMemo(() => vacancies, [vacancies]);

  const renderOrgCard = useCallback((org) => (
    <article
      className="org-card-modern"
      onClick={() => org.public_id && navigate(`/organizations/${org.public_id}`)}
      role={org.public_id ? "button" : undefined}
      tabIndex={org.public_id ? 0 : undefined}
      onKeyDown={(e) => {
        if (org.public_id && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          navigate(`/organizations/${org.public_id}`);
        }
      }}
    >
      <div className="org-card-modern__media">
        {org.avatar_url ? (
          <img className="org-card-modern__avatar" src={org.avatar_url} alt="" loading="lazy" />
        ) : (
          <div className="org-card-modern__avatar-placeholder" aria-hidden="true">
            {org.name ? org.name.charAt(0).toUpperCase() : "?"}
          </div>
        )}
      </div>
      <div className="org-card-modern__body">
        <h3 className="org-card-modern__title">{org.name || "Организация"}</h3>
        <div className="org-card-modern__meta">
          {org.address && (
            <span className="org-card-modern__meta-item" title={org.address}>
              {org.address?.length > 40 ? `${org.address.slice(0, 40)}…` : org.address}
            </span>
          )}
          {org.website && (
            <span className="org-card-modern__meta-item org-card-modern__meta-item--muted">
              {org.website?.replace(/^https?:\/\//i, "")?.slice(0, 30)}
              {(org.website?.replace(/^https?:\/\//i, "")?.length > 30) ? "…" : ""}
            </span>
          )}
          {!org.address && !org.website && (
            <span className="org-card-modern__meta-item org-card-modern__meta-item--muted">Нет контактов</span>
          )}
        </div>
        {org.description && (
          <p className="org-card-modern__description" title={org.description}>
            {org.description.slice(0, 120)}
            {org.description?.length > 120 ? "…" : ""}
          </p>
        )}
        {org.public_id && (
          <span className="org-card-modern__cta">
            Открыть организацию
            <span className="org-card-modern__cta-arrow" aria-hidden="true">→</span>
          </span>
        )}
      </div>
    </article>
  ), [navigate]);

  const renderLabCard = useCallback((lab) => (
    <article
      className="org-card-modern"
      onClick={() => lab.public_id && navigate(`/laboratories/${lab.public_id}`)}
      role={lab.public_id ? "button" : undefined}
      tabIndex={lab.public_id ? 0 : undefined}
      onKeyDown={(e) => {
        if (lab.public_id && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          navigate(`/laboratories/${lab.public_id}`);
        }
      }}
    >
      <div className="org-card-modern__media">
        {labImages(lab.image_urls)[0] ? (
          <img className="org-card-modern__avatar" src={labImages(lab.image_urls)[0]} alt="" loading="lazy" />
        ) : (
          <div className="org-card-modern__avatar-placeholder" aria-hidden="true">
            {lab.name ? lab.name.charAt(0).toUpperCase() : "?"}
          </div>
        )}
      </div>
      <div className="org-card-modern__body">
        <h3 className="org-card-modern__title">{lab.name || "Лаборатория"}</h3>
        <div className="org-card-modern__meta">
          {lab.organization && (
            <span className="org-card-modern__meta-item">{lab.organization.name}</span>
          )}
          {lab.head_employee && (
            <span className="org-card-modern__meta-item org-card-modern__meta-item--head">
              Руководитель: {lab.head_employee.full_name}
            </span>
          )}
        </div>
        {(lab.description || lab.activities) && (
          <p className="org-card-modern__description" title={lab.description || lab.activities}>
            {(lab.description || lab.activities)?.slice(0, 120)}
            {(lab.description || lab.activities)?.length > 120 ? "…" : ""}
          </p>
        )}
        {lab.public_id && (
          <span className="org-card-modern__cta">
            Открыть лабораторию
            <span className="org-card-modern__cta-arrow" aria-hidden="true">→</span>
          </span>
        )}
      </div>
    </article>
  ), [navigate]);

  const renderVacancyCard = useCallback((vacancy) => {
    const skills = parseVacancySkills(vacancy.requirements, vacancy.description);
    return (
      <article
        className="vacancy-card"
        onClick={() => vacancy.public_id && navigate(`/vacancies/${vacancy.public_id}`)}
        role={vacancy.public_id ? "button" : undefined}
        tabIndex={vacancy.public_id ? 0 : undefined}
        onKeyDown={(e) => {
          if (vacancy.public_id && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            navigate(`/vacancies/${vacancy.public_id}`);
          }
        }}
      >
        <div className="vacancy-card__accent" aria-hidden="true" />
        <div className="vacancy-card__inner">
          <div className="vacancy-card__header">
            <span className="vacancy-card__icon" aria-hidden="true">
              {vacancy.name ? vacancy.name.charAt(0).toUpperCase() : "V"}
            </span>
            <div className="vacancy-card__headline">
              <h3 className="vacancy-card__title">{vacancy.name || "Вакансия"}</h3>
              {vacancy.employment_type && <span className="vacancy-card__type">{vacancy.employment_type}</span>}
            </div>
          </div>
          {vacancy.created_at && (
            <p className="vacancy-card__date">
              <span className="vacancy-card__date-label">Опубликовано</span> {formatVacancyDate(vacancy.created_at)}
            </p>
          )}
          {skills.length > 0 && (
            <div className="vacancy-card__skills" aria-label="Навыки">
              {skills.map((skill, i) => (
                <span key={i} className="vacancy-card__skill">{skill}</span>
              ))}
            </div>
          )}
          {vacancy.public_id && (
            <span className="vacancy-card__cta">
              Открыть вакансию
              <span className="vacancy-card__cta-arrow" aria-hidden="true">→</span>
            </span>
          )}
        </div>
      </article>
    );
  }, [navigate]);

  const directions = useMemo(() => {
    const fromApi = (stats?.research_interests || []).filter(Boolean);
    const combined = [...new Set([...fromApi, ...FALLBACK_DIRECTIONS])];
    return combined.length > 0 ? combined : FALLBACK_DIRECTIONS;
  }, [stats?.research_interests]);

  return (
    <main className="main">
      <section className="hero">
        <div className="hero-content">
          <div className="hero-search-wrap">
            <GlobalSearch />
          </div>
          <div className="hero-main">
            <div className="hero-copy">
              <h1>Найдите лабораторию и начните новый проект</h1>
              <p>
                Платформа, где лаборатории публикуют исследования и вакансии, а исследователи и
                студенты находят подходящие возможности и ускоряют научные открытия.
              </p>
            </div>
          </div>
          <div className="hero-directions-marquee-wrap">
            <div className="hero-directions-marquee" aria-hidden="true">
              <div className="hero-directions-marquee-copy">
                {directions.map((d) => (
                  <span key={`a-${d}`} className="hero-direction-tag">{d}</span>
                ))}
              </div>
              <div className="hero-directions-marquee-copy" aria-hidden="true">
                {directions.map((d) => (
                  <span key={`b-${d}`} className="hero-direction-tag">{d}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="metrics">
        <div className="metric-card">
          <div className="metric-value">
            {loading && !stats ? "…" : formatMetric(stats?.laboratories ?? 0)}
          </div>
          <div className="metric-label">{getMetricLabelLaboratories(stats?.laboratories ?? 0)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {loading && !stats ? "…" : formatMetric(stats?.vacancies ?? 0)}
          </div>
          <div className="metric-label">{getMetricLabelVacancies(stats?.vacancies ?? 0)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {loading && !stats ? "…" : formatMetric(stats?.responses ?? 0)}
          </div>
          <div className="metric-label">{getMetricLabelResponses(stats?.responses ?? 0)}</div>
        </div>
      </section>

      {(loading || featuredOrgs.length > 0) && (
        <section id="orgs" className="section">
          <div className="section-header">
            <h2>Организации недели</h2>
            <p>Организации на платформе с лабораториями и вакансиями.</p>
          </div>
          {error && <p className="error">{error}</p>}
          {loading && !error && (
            <div className="org-cards-grid home-skeleton-grid" aria-busy="true" role="status" aria-label="Загрузка">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <article key={i} className="org-card-modern">
                  <div className="org-card-modern__media">
                    <div className="skeleton" aria-hidden="true" style={{ width: "100%", aspectRatio: 1 }} />
                  </div>
                  <div className="org-card-modern__body">
                    <div className="skeleton" aria-hidden="true" style={{ height: "1.125rem", width: "80%" }} />
                    <div className="skeleton" aria-hidden="true" style={{ height: "0.875rem" }} />
                    <div className="skeleton" aria-hidden="true" style={{ height: "0.875rem" }} />
                  </div>
                </article>
              ))}
            </div>
          )}
          {!loading && !error && (
            <FeaturedCarousel
              items={featuredOrgs}
              renderCard={renderOrgCard}
              ariaLabel="Организации недели"
            />
          )}
        </section>
      )}

      {(loading || featuredLabs.length > 0) && (
        <section id="labs" className="section">
          <div className="section-header">
            <h2>Лаборатории недели</h2>
            <p>Лаборатории на платформе с открытыми позициями и задачами.</p>
          </div>
          {error && <p className="error">{error}</p>}
          {loading && !error && (
            <div className="org-cards-grid labs-skeleton-grid" aria-busy="true" role="status" aria-label="Загрузка">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <article key={i} className="org-card-modern">
                  <div className="org-card-modern__media">
                    <div className="skeleton" aria-hidden="true" />
                  </div>
                  <div className="org-card-modern__body">
                    <div className="skeleton" aria-hidden="true" />
                    <div className="skeleton" aria-hidden="true" />
                    <div className="skeleton" aria-hidden="true" />
                    <div className="skeleton" aria-hidden="true" />
                  </div>
                </article>
              ))}
            </div>
          )}
          {!loading && !error && (
            <FeaturedCarousel
              items={featuredLabs}
              renderCard={renderLabCard}
              ariaLabel="Лаборатории недели"
            />
          )}
        </section>
      )}

      {(loading || featuredVacancies.length > 0) && (
        <section id="vacancies" className="section">
          <div className="section-header">
            <h2>Открытые вакансии</h2>
            <p>Новые роли из университетов, институтов и исследовательских стартапов.</p>
          </div>
          {error && <p className="error">{error}</p>}
          {loading && !error && (
            <div className="org-cards-grid home-skeleton-grid" aria-busy="true" role="status" aria-label="Загрузка">
              {[1, 2, 3, 4, 5].map((i) => (
                <article key={i} className="org-card-modern">
                  <div className="org-card-modern__media">
                    <div className="skeleton" aria-hidden="true" style={{ width: "100%", aspectRatio: 1 }} />
                  </div>
                  <div className="org-card-modern__body">
                    <div className="skeleton" aria-hidden="true" style={{ height: "1.125rem", width: "80%" }} />
                    <div className="skeleton" aria-hidden="true" style={{ height: "0.875rem" }} />
                  </div>
                </article>
              ))}
            </div>
          )}
          {!loading && !error && (
            <FeaturedCarousel
              items={featuredVacancies}
              renderCard={renderVacancyCard}
              ariaLabel="Открытые вакансии"
            />
          )}
        </section>
      )}

      {!auth && (
        <section className="cta section-cta">
          <div className="cta__content">
            <h2 className="cta__title">Присоединяйтесь к платформе</h2>
            <p className="cta__text">
              Добавляйте лаборатории и вакансии, откликайтесь на позиции или найдите команду для своего проекта — для организаций, исследователей и студентов.
            </p>
          </div>
          <Link className="primary-btn cta__btn" to="/login">
            Начать
          </Link>
        </section>
      )}
    </main>
  );
}
