import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import PageLoader from "../components/PageLoader";

const APPLICANTS_PAGE_SIZE = 20;
const ROLE_LABELS = { student: "Студент", researcher: "Исследователь" };
const JOB_SEARCH_LABELS = {
  active: "Активно ищу работу",
  passive: "Рассматриваю предложения",
  not_active: "Не ищу работу",
};

function fileNameFromUrl(url) {
  try {
    const withoutQuery = url.split("?")[0];
    const parts = withoutQuery.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "документ");
  } catch {
    return "документ";
  }
}

function ApplicantCard({ applicant, onOpen }) {
  const hasLink = !!applicant.public_id;
  const roleLabel = ROLE_LABELS[applicant.role] || applicant.role;

  return (
    <article
      className="applicant-card"
      onClick={() => hasLink && onOpen(applicant.public_id)}
      role={hasLink ? "button" : undefined}
      tabIndex={hasLink ? 0 : undefined}
      onKeyDown={(e) => {
        if (hasLink && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(applicant.public_id);
        }
      }}
    >
      <div className="applicant-card__accent" aria-hidden="true" />
      <div className="applicant-card__inner">
        <div className="applicant-card__header">
          {applicant.photo_url ? (
            <img
              className="applicant-card__icon applicant-card__icon--img"
              src={applicant.photo_url}
              alt=""
              loading="lazy"
            />
          ) : (
            <span className="applicant-card__icon" aria-hidden="true">
              {applicant.full_name ? applicant.full_name.charAt(0).toUpperCase() : "?"}
            </span>
          )}
          <div className="applicant-card__headline">
            <h3 className="applicant-card__title">{applicant.full_name || "Соискатель"}</h3>
            <span className="applicant-card__role">{roleLabel}</span>
          </div>
        </div>
        {applicant.summary && (
          <p className="applicant-card__description" title={applicant.summary}>
            {applicant.summary.length > 100 ? `${applicant.summary.slice(0, 100)}…` : applicant.summary}
          </p>
        )}
        {hasLink && (
          <span className="applicant-card__cta">
            Открыть профиль
            <span className="applicant-card__cta-arrow" aria-hidden="true">→</span>
          </span>
        )}
      </div>
    </article>
  );
}

function ApplicantDetailView({ details, onBack }) {
  const [docsExpanded, setDocsExpanded] = useState(false);
  const [educationExpanded, setEducationExpanded] = useState(false);
  const [publicationsExpanded, setPublicationsExpanded] = useState(false);
  const contacts = details.contacts || {};
  const roleLabel = ROLE_LABELS[details.role] || details.role;
  const documentUrls = details.document_urls || [];
  const hasDocs = documentUrls.length > 0;

  return (
    <div className="applicant-detail">
      <button type="button" className="org-detail-back" onClick={onBack}>
        ← Назад к списку
      </button>
      <div className="org-details">
        <div className="applicant-detail-hero org-detail-hero">
          <div className="org-detail-hero__media">
            {details.photo_url ? (
              <img
                className="org-detail-hero__avatar"
                src={details.photo_url}
                alt=""
              />
            ) : (
              <div className="org-detail-hero__avatar-placeholder applicant-detail-hero__avatar-placeholder">
                {details.full_name ? details.full_name.charAt(0).toUpperCase() : "?"}
              </div>
            )}
          </div>
          <div className="org-detail-hero__body applicant-detail-hero__body">
            <h1 className="org-detail-hero__title">{details.full_name || "Соискатель"}</h1>
            <div className="applicant-detail-hero__meta">
              <span className="applicant-detail-hero__role-chip">{roleLabel}</span>
              {details.resume_url && (
                <a
                  href={details.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="applicant-detail-hero__cta"
                >
                  Скачать резюме
                  <span className="applicant-detail-hero__cta-arrow" aria-hidden="true">→</span>
                </a>
              )}
            </div>
            <div className="applicant-detail-hero__contacts">
              {details.mail && (
                <a href={`mailto:${details.mail}`} className="applicant-detail-hero__contact">
                  {details.mail}
                </a>
              )}
              {contacts.phone && (
                <a href={`tel:${contacts.phone}`} className="applicant-detail-hero__contact">
                  {contacts.phone}
                </a>
              )}
              {contacts.telegram && (
                <a
                  href={`https://t.me/${contacts.telegram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="applicant-detail-hero__contact"
                >
                  {contacts.telegram}
                </a>
              )}
              {!details.mail && !contacts.phone && !contacts.telegram && (
                <span className="profile-field-hint">Контакты не указаны</span>
              )}
            </div>
          </div>
        </div>

        <div className="applicant-detail__main">
          {!details.resume_url && (
            <section className="applicant-detail-section">
              <h2 className="applicant-detail-section__title">Резюме</h2>
              <p className="applicant-detail-section__text applicant-detail-section__text--muted">Резюме не загружено</p>
            </section>
          )}

          {details.role === "student" && (
            <div className="applicant-detail-content">
              {details.status && (
                <section className="applicant-detail-section">
                  <h2 className="applicant-detail-section__title">Статус</h2>
                  <p className="applicant-detail-section__text">{details.status}</p>
                </section>
              )}
              {details.summary && (
                <section className="applicant-detail-section">
                  <h2 className="applicant-detail-section__title">О себе</h2>
                  <p className="applicant-detail-section__text" style={{ whiteSpace: "pre-wrap" }}>{details.summary}</p>
                </section>
              )}
              {(details.education || []).length > 0 && (
                <div className={`profile-card-collapsible applicant-detail-collapsible ${educationExpanded ? "expanded" : ""}`}>
                  <button
                    type="button"
                    className="profile-card-header applicant-detail-collapsible__header"
                    onClick={() => setEducationExpanded((v) => !v)}
                    aria-expanded={educationExpanded}
                  >
                    Образование ({details.education.length})
                  </button>
                  <div className="profile-card-body">
                    <ul className="applicant-detail-list">
                      {details.education.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {(details.skills || []).length > 0 && (
                <section className="applicant-detail-section">
                  <h2 className="applicant-detail-section__title">Навыки</h2>
                  <div className="applicant-detail-section__tags">
                    {details.skills.map((s, i) => (
                      <span key={i} className="applicant-detail-tag">{s}</span>
                    ))}
                  </div>
                </section>
              )}
              {(details.research_interests || []).length > 0 && (
                <section className="applicant-detail-section">
                  <h2 className="applicant-detail-section__title">Научные интересы</h2>
                  <div className="applicant-detail-section__tags">
                    {details.research_interests.map((s, i) => (
                      <span key={i} className="applicant-detail-tag">{s}</span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {details.role === "researcher" && (
            <div className="applicant-detail-content">
              {(details.academic_degree || details.position) && (
                <section className="applicant-detail-section">
                  <h2 className="applicant-detail-section__title">Позиция</h2>
                  <p className="applicant-detail-section__text">
                    {[details.academic_degree, details.position].filter(Boolean).join(", ")}
                  </p>
                </section>
              )}
              {(details.research_interests || []).length > 0 && (
                <section className="applicant-detail-section">
                  <h2 className="applicant-detail-section__title">Научные интересы</h2>
                  <div className="applicant-detail-section__tags">
                    {details.research_interests.map((s, i) => (
                      <span key={i} className="applicant-detail-tag">{s}</span>
                    ))}
                  </div>
                </section>
              )}
              {(details.education || []).length > 0 && (
                <div className={`profile-card-collapsible applicant-detail-collapsible ${educationExpanded ? "expanded" : ""}`}>
                  <button
                    type="button"
                    className="profile-card-header applicant-detail-collapsible__header"
                    onClick={() => setEducationExpanded((v) => !v)}
                    aria-expanded={educationExpanded}
                  >
                    Образование ({details.education.length})
                  </button>
                  <div className="profile-card-body">
                    <ul className="applicant-detail-list">
                      {details.education.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {([details.hindex_wos, details.hindex_scopus, details.hindex_rsci, details.hindex_openalex].some(Boolean)) && (
                <section className="applicant-detail-section">
                  <h2 className="applicant-detail-section__title">H-index</h2>
                  <div className="applicant-detail-hindex">
                    {details.hindex_wos != null && (
                      <span className="applicant-detail-hindex__item">
                        <span className="applicant-detail-hindex__source">WOS</span>
                        <span className="applicant-detail-hindex__value">{details.hindex_wos}</span>
                      </span>
                    )}
                    {details.hindex_scopus != null && (
                      <span className="applicant-detail-hindex__item">
                        <span className="applicant-detail-hindex__source">Scopus</span>
                        <span className="applicant-detail-hindex__value">{details.hindex_scopus}</span>
                      </span>
                    )}
                    {details.hindex_rsci != null && (
                      <span className="applicant-detail-hindex__item">
                        <span className="applicant-detail-hindex__source">RSCI</span>
                        <span className="applicant-detail-hindex__value">{details.hindex_rsci}</span>
                      </span>
                    )}
                    {details.hindex_openalex != null && (
                      <span className="applicant-detail-hindex__item">
                        <span className="applicant-detail-hindex__source">OpenAlex</span>
                        <span className="applicant-detail-hindex__value">{details.hindex_openalex}</span>
                      </span>
                    )}
                  </div>
                </section>
              )}
              {(details.laboratories || []).length > 0 && (
                <section className="applicant-detail-section">
                  <h2 className="applicant-detail-section__title">Лаборатории</h2>
                  <ul className="applicant-detail-list">
                    {details.laboratories.map((lab, i) => (
                      <li key={i}>
                        {lab.public_id ? (
                          <a href={`/laboratories/${lab.public_id}`} className="applicant-detail-link">{lab.name}</a>
                        ) : (
                          lab.name
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {(details.publications || []).length > 0 && (
                <div className={`profile-card-collapsible applicant-detail-collapsible ${publicationsExpanded ? "expanded" : ""}`}>
                  <button
                    type="button"
                    className="profile-card-header applicant-detail-collapsible__header"
                    onClick={() => setPublicationsExpanded((v) => !v)}
                    aria-expanded={publicationsExpanded}
                  >
                    Публикации ({details.publications.length})
                  </button>
                  <div className="profile-card-body">
                    <ul className="applicant-detail-list">
                      {details.publications.map((pub, i) => (
                        <li key={i}>
                          {pub.title}
                          {pub.link && (
                            <a href={pub.link} target="_blank" rel="noopener noreferrer" className="applicant-detail-link">
                              Ссылка
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {(details.job_search_status ||
                details.desired_positions ||
                details.employment_type_preference ||
                details.preferred_region ||
                details.availability_date ||
                details.salary_expectation ||
                details.job_search_notes) && (
                <section className="applicant-detail-section applicant-detail-jobsearch">
                  <h2 className="applicant-detail-section__title">Поиск работы</h2>
                  <div className="applicant-detail-jobsearch__card">
                    {details.job_search_status && (
                      <div className="applicant-detail-jobsearch__row">
                        <span className="applicant-detail-jobsearch__label">Статус</span>
                        <span className="applicant-detail-jobsearch__value applicant-detail-jobsearch__value--status">
                          {JOB_SEARCH_LABELS[details.job_search_status] || details.job_search_status}
                        </span>
                      </div>
                    )}
                    {details.desired_positions && (
                      <div className="applicant-detail-jobsearch__row">
                        <span className="applicant-detail-jobsearch__label">Желаемые позиции</span>
                        <span className="applicant-detail-jobsearch__value">{details.desired_positions}</span>
                      </div>
                    )}
                    {details.employment_type_preference && (
                      <div className="applicant-detail-jobsearch__row">
                        <span className="applicant-detail-jobsearch__label">Тип занятости</span>
                        <span className="applicant-detail-jobsearch__value">{details.employment_type_preference}</span>
                      </div>
                    )}
                    {details.preferred_region && (
                      <div className="applicant-detail-jobsearch__row">
                        <span className="applicant-detail-jobsearch__label">Регион</span>
                        <span className="applicant-detail-jobsearch__value">{details.preferred_region}</span>
                      </div>
                    )}
                    {details.availability_date && (
                      <div className="applicant-detail-jobsearch__row">
                        <span className="applicant-detail-jobsearch__label">Дата выхода</span>
                        <span className="applicant-detail-jobsearch__value">{details.availability_date}</span>
                      </div>
                    )}
                    {details.salary_expectation && (
                      <div className="applicant-detail-jobsearch__row">
                        <span className="applicant-detail-jobsearch__label">Ожидания по зарплате</span>
                        <span className="applicant-detail-jobsearch__value applicant-detail-jobsearch__value--salary">
                          {/^\d+$/.test(String(details.salary_expectation).trim())
                            ? `${Number(details.salary_expectation).toLocaleString("ru-RU")} ₽`
                            : details.salary_expectation}
                        </span>
                      </div>
                    )}
                    {details.job_search_notes && (
                      <div className="applicant-detail-jobsearch__row applicant-detail-jobsearch__row--notes">
                        <span className="applicant-detail-jobsearch__label">Примечания</span>
                        <span className="applicant-detail-jobsearch__value applicant-detail-jobsearch__value--notes" style={{ whiteSpace: "pre-wrap" }}>
                          {details.job_search_notes}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

          {hasDocs && (
            <div
              className={`profile-card-collapsible applicant-detail-collapsible ${docsExpanded ? "expanded" : ""}`}
              style={{ marginTop: "1.5rem" }}
            >
              <button
                type="button"
                className="profile-card-header applicant-detail-collapsible__header"
                onClick={() => setDocsExpanded((v) => !v)}
                aria-expanded={docsExpanded}
              >
                Дополнительные файлы ({documentUrls.length})
              </button>
              <div className="profile-card-body">
                <ul className="applicant-detail-docs-list">
                  {documentUrls.map((url, index) => (
                    <li key={index} className="applicant-detail-docs-item">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="applicant-detail-docs-link"
                      >
                        {fileNameFromUrl(url) || `Документ ${index + 1}`}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Applicants() {
  const { auth, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { publicId } = useParams();
  const selectedId = useMemo(() => (publicId ? String(publicId) : null), [publicId]);

  const [applicants, setApplicants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);

  const roleKey = auth?.user?.role_name;
  const canAccess =
    roleKey === "lab_admin" || roleKey === "lab_representative";

  useEffect(() => {
    if (!auth) {
      navigate("/login", { replace: true });
      return;
    }
    if (auth?.token && auth?.user && !auth.user.role_name) {
      refreshUser();
      return;
    }
    if (auth && !canAccess) {
      navigate("/", { replace: true });
      return;
    }
  }, [auth, canAccess, navigate, refreshUser]);

  useEffect(() => {
    if (!canAccess) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("size", String(APPLICANTS_PAGE_SIZE));
        const data = await apiRequest(`/applicants/?${params.toString()}`);
        if (cancelled) return;
        setApplicants(data?.items ?? []);
        setTotal(data?.total ?? 0);
      } catch (e) {
        if (cancelled) return;
        if (e.status === 403) {
          refreshUser();
          navigate("/", { replace: true });
          return;
        }
        setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [canAccess, page, navigate, refreshUser]);

  useEffect(() => {
    if (!canAccess || !selectedId) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    async function loadDetails() {
      try {
        setLoadingDetails(true);
        setError(null);
        const data = await apiRequest(`/applicants/public/${selectedId}/details`);
        if (cancelled) return;
        setDetails(data);
      } catch (e) {
        if (cancelled) return;
        if (e.status === 403) {
          refreshUser();
          navigate("/", { replace: true });
          return;
        }
        setError(e.message);
        setDetails(null);
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    }
    loadDetails();
    return () => { cancelled = true; };
  }, [canAccess, selectedId, navigate, refreshUser]);

  const openApplicant = useCallback(
    (id) => navigate(`/applicants/${id}`),
    [navigate]
  );
  const goBack = useCallback(() => {
    setError(null);
    navigate("/applicants");
  }, [navigate]);

  if (!auth) return <PageLoader />;
  if (auth && !canAccess) return <PageLoader />;

  if (selectedId) {
    if (loadingDetails) return <PageLoader />;
    if (error) {
      return (
        <main className="main">
          <section className="section">
            <div className="org-details-page">
              <div className="org-detail-error">
                <button className="org-detail-back" onClick={goBack} type="button">
                  ← Назад
                </button>
                <div className="org-detail-error-banner" role="alert">
                  {error}
                </div>
              </div>
            </div>
          </section>
        </main>
      );
    }
    if (details) {
      return (
        <main className="main">
          <section className="section">
            <div className="org-details-page">
              <ApplicantDetailView details={details} onBack={goBack} />
            </div>
          </section>
        </main>
      );
    }
    return <PageLoader />;
  }

  return (
    <main className="main">
      <section className="section" aria-label={selectedId ? "Профиль соискателя" : "Соискатели"}>
        <div className="section-header">
          <h2>Соискатели</h2>
          <p>Опубликованные профили студентов и исследователей. Откройте карточку для просмотра контактов и резюме.</p>
        </div>
        {error && (
          <div className="org-detail-error-banner" role="alert">
            {error}
          </div>
        )}
        {loading && (
          <div className="org-cards-grid applicant-cards-grid applicant-skeleton-grid" aria-busy="true" role="status" aria-label="Загрузка">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <article key={i} className="applicant-card">
                <div className="applicant-card__accent" />
                <div className="applicant-card__inner">
                  <div className="applicant-card__header">
                    <div className="skeleton applicant-card__icon-skeleton" aria-hidden="true" />
                    <div className="applicant-card__headline">
                      <div className="skeleton" aria-hidden="true" style={{ height: "1rem", width: "70%" }} />
                      <div className="skeleton" aria-hidden="true" style={{ height: "0.75rem", width: "40%", marginTop: "0.5rem" }} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && (
          <>
            <div className="org-cards-grid applicant-cards-grid">
              {applicants.length === 0 ? (
                <div className="lab-empty-block org-empty-block">
                  <p className="lab-empty">Нет опубликованных соискателей</p>
                  <p className="lab-empty-hint">
                    Студенты и исследователи могут включить публикацию профиля в разделе «Профиль».
                  </p>
                </div>
              ) : (
                applicants.map((a) => (
                  <ApplicantCard key={a.public_id} applicant={a} onOpen={openApplicant} />
                ))
              )}
            </div>
            {total > APPLICANTS_PAGE_SIZE && (
              <div className="vacancy-pagination">
                <span className="vacancy-pagination__info">
                  Показано {(page - 1) * APPLICANTS_PAGE_SIZE + 1}–{Math.min(page * APPLICANTS_PAGE_SIZE, total)} из {total}
                </span>
                <div className="vacancy-pagination__buttons">
                  <button
                    type="button"
                    className="vacancy-pagination__btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    className="vacancy-pagination__btn"
                    disabled={page * APPLICANTS_PAGE_SIZE >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Вперёд
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
