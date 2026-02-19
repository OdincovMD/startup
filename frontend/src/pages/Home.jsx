import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const FALLBACK_DIRECTIONS = [
  "AI", "Biomed", "Physics", "Climate", "Genomics", "Robotics",
  "Materials", "Neuroscience", "Quantum", "Chemistry", "Bioinformatics",
  "Machine Learning", "Synthetic Biology", "Nanotech", "Energy",
];
const METRIC_LABELS = {
  laboratories: "Лабораторий на платформе",
  vacancies: "Открытых позиций",
  responses: "Откликов отправлено",
};

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
        const [orgsJson, labsJson, vacanciesJson, statsJson] = await Promise.all([
          apiRequest("/labs/"),
          apiRequest("/laboratories/"),
          apiRequest("/vacancies/"),
          apiRequest("/stats/").catch(() => null),
        ]);
        setOrgs(orgsJson);
        setLaboratories(labsJson);
        setVacancies(vacanciesJson);
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

  const featuredOrgs = useMemo(() => orgs.slice(0, 6), [orgs]);
  const featuredLabs = useMemo(() => laboratories.slice(0, 6), [laboratories]);
  const featuredVacancies = useMemo(() => vacancies.slice(0, 5), [vacancies]);

  const directions = useMemo(() => {
    const fromApi = (stats?.research_interests || []).filter(Boolean);
    const combined = [...new Set([...fromApi, ...FALLBACK_DIRECTIONS])];
    return combined.length > 0 ? combined : FALLBACK_DIRECTIONS;
  }, [stats?.research_interests]);

  return (
    <main className="main">
      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">Единая платформа для научного найма</div>
          <h1>Найдите лабораторию и начните новый проект</h1>
          <p>
            Платформа, где лаборатории публикуют исследования и вакансии, а исследователи и
            студенты находят подходящие возможности и ускоряют научные открытия.
          </p>
          <div className="hero-actions">
            <Link className="primary-btn" to="/laboratories">
              Смотреть лаборатории
            </Link>
            <Link className="secondary-btn" to="/vacancies">
              Открытые вакансии
            </Link>
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
          <div className="metric-label">{METRIC_LABELS.laboratories}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {loading && !stats ? "…" : formatMetric(stats?.vacancies ?? 0)}
          </div>
          <div className="metric-label">{METRIC_LABELS.vacancies}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {loading && !stats ? "…" : formatMetric(stats?.responses ?? 0)}
          </div>
          <div className="metric-label">{METRIC_LABELS.responses}</div>
        </div>
      </section>

      {featuredOrgs.length > 0 && (
        <section id="orgs" className="section">
          <div className="section-header">
            <h2>Организации недели</h2>
            <p>Организации на платформе, которые активно набирают исследователей и студентов.</p>
          </div>
          {loading && <p className="muted">Загружаем организации...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && (
            <div className="card-grid">
              {featuredOrgs.map((org) => (
                <article key={org.id} className="info-card">
                  <div className="info-card-header">
                    {org.avatar_url && (
                      <img className="org-avatar" src={org.avatar_url} alt={org.name || "Организация"} />
                    )}
                    <div className="info-card-title">{org.name}</div>
                  </div>
                  <div className="info-card-subtitle">
                    {org.address || org.website || ""}
                  </div>
                  {org.description && (
                    <p className="info-card-text">{org.description}</p>
                  )}
                  <div className="chip-row">
                    {org.website && <span className="chip">{org.website}</span>}
                    <span className="chip">Открытые позиции</span>
                  </div>
                  {org.public_id && (
                    <Link className="ghost-btn" to={`/organizations/${org.public_id}`}>
                      Открыть организацию
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {featuredLabs.length > 0 && (
        <section id="labs" className="section">
          <div className="section-header">
            <h2>Лаборатории недели</h2>
            <p>Лаборатории на платформе с открытыми позициями и задачами.</p>
          </div>
          {loading && <p className="muted">Загружаем лаборатории...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && (
            <div className="org-cards-grid">
              {featuredLabs.map((lab) => (
                <article
                  key={lab.id}
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
                      <img
                        className="org-card-modern__avatar"
                        src={labImages(lab.image_urls)[0]}
                        alt=""
                        loading="lazy"
                      />
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
                    </div>
                    {(lab.description || lab.activities) && (
                      <p className="org-card-modern__description" title={lab.description || lab.activities}>
                        {lab.description || lab.activities}
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
              ))}
            </div>
          )}
        </section>
      )}

      {featuredVacancies.length > 0 && (
        <section id="vacancies" className="section">
          <div className="section-header">
            <h2>Открытые вакансии</h2>
            <p>Новые роли из университетов, институтов и исследовательских стартапов.</p>
          </div>
          {loading && <p className="muted">Загружаем вакансии...</p>}
          {!loading && !error && (
            <div className="list-card">
              {featuredVacancies.map((vacancy) => (
                <div key={vacancy.id} className="list-row">
                  <div>
                    <div className="list-title">{vacancy.name}</div>
                    <div className="list-subtitle">
                      {[vacancy.employment_type, vacancy.organization?.name].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {vacancy.public_id ? (
                    <Link className="ghost-btn" to={`/vacancies/${vacancy.public_id}`}>
                      Смотреть
                    </Link>
                  ) : (
                    <span className="ghost-btn" style={{ opacity: 0.6 }}>Смотреть</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="cta">
        <div>
          <h2>Готовы собрать команду?</h2>
          <p>Добавьте лабораторию, откройте позиции и начинайте подбор уже сегодня.</p>
        </div>
        <Link className="primary-btn" to={auth?.token ? "/profile" : "/login"}>
          Начать
        </Link>
      </section>
    </main>
  );
}
