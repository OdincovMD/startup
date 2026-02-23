import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import EmployeeModal from "./profile/EmployeeModal";

const RESPONSE_STATUS_LABELS = { new: "Новый", accepted: "Принят", rejected: "Отклонен" };

function formatVacancyDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function parseSkillsFromRequirements(requirements, description) {
  const text = [requirements, description].filter(Boolean).join(" ");
  if (!text.trim()) return [];
  const parts = text
    .split(/[,;\n·]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 40);
  return [...new Set(parts)].slice(0, 6);
}

export default function Vacancies() {
  const { auth } = useAuth();
  const [vacancies, setVacancies] = useState([]);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [employeePreview, setEmployeePreview] = useState(null);
  const [showEmployeePublications, setShowEmployeePublications] = useState(false);
  const [myResponse, setMyResponse] = useState(null);
  const [respondLoading, setRespondLoading] = useState(false);
  const [respondError, setRespondError] = useState(null);
  const { publicId } = useParams();
  const navigate = useNavigate();
  const selectedId = useMemo(() => (publicId ? String(publicId) : null), [publicId]);

  useEffect(() => {
    async function loadVacancies() {
      try {
        setLoading(true);
        const data = await apiRequest("/vacancies/");
        setVacancies(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadVacancies();
  }, []);

  useEffect(() => {
    async function loadDetails() {
      if (!selectedId) {
        setDetails(null);
        setLoadingDetails(false);
        return;
      }
      try {
        setLoadingDetails(true);
        setError(null);
        const vacancy = await apiRequest(`/vacancies/public/${selectedId}/details`);
        setDetails(vacancy);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingDetails(false);
      }
    }
    loadDetails();
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setMyResponse(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest(`/vacancies/public/${selectedId}/my-response`).catch(() => ({ has_response: false }));
        if (!cancelled) setMyResponse(data || { has_response: false });
      } catch {
        if (!cancelled) setMyResponse({ has_response: false });
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId, auth?.token]);

  const detailSkills = useMemo(
    () => (details ? parseSkillsFromRequirements(details.requirements, details.description) : []),
    [details]
  );

  const handleRespond = async () => {
    if (!selectedId || respondLoading) return;
    setRespondError(null);
    setRespondLoading(true);
    try {
      const data = await apiRequest(`/vacancies/public/${selectedId}/respond`, { method: "POST" });
      setMyResponse({ has_response: true, id: data.id, status: data.status });
    } catch (e) {
      setRespondError(e.message || "Не удалось отправить отклик");
    } finally {
      setRespondLoading(false);
    }
  };

  const openVacancy = (publicIdValue) => {
    navigate(`/vacancies/${publicIdValue}`);
  };

  const openLab = (publicIdValue) => {
    if (!publicIdValue) return;
    navigate(`/laboratories/${publicIdValue}`);
  };

  const openOrg = (publicIdValue) => {
    if (!publicIdValue) return;
    navigate(`/organizations/${publicIdValue}`);
  };

  const openQuery = (publicIdValue) => {
    if (!publicIdValue) return;
    navigate(`/queries/${publicIdValue}`);
  };

  const backToList = () => {
    navigate("/vacancies");
  };

  return (
    <main className="main">
      <section className="section">
        {!selectedId && (
          <div className="section-header">
            <h2>Вакансии</h2>
            <p>Опубликованные вакансии платформы. Откройте карточку, чтобы увидеть описание и контакты.</p>
          </div>
        )}
        {loading && !selectedId && (
          <div className="org-cards-grid labs-skeleton-grid" aria-busy="true" role="status" aria-label="Загрузка">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        {error && <p className="error">{error}</p>}

        {!loading && !error && !selectedId && (
          <div className="org-cards-grid">
            {vacancies.length === 0 ? (
              <div className="lab-empty-block org-empty-block">
                <p className="lab-empty">Опубликованные вакансии пока не добавлены.</p>
                <p className="lab-empty-hint">Организации публикуют вакансии в разделе «Профиль».</p>
              </div>
            ) : (
              vacancies.map((vacancy) => {
                const skills = parseSkillsFromRequirements(vacancy.requirements, vacancy.description);
                return (
                  <article
                    key={vacancy.id}
                    className="vacancy-card"
                    onClick={() => vacancy.public_id && openVacancy(vacancy.public_id)}
                    role={vacancy.public_id ? "button" : undefined}
                    tabIndex={vacancy.public_id ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (vacancy.public_id && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        openVacancy(vacancy.public_id);
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
                          {vacancy.employment_type && (
                            <span className="vacancy-card__type">{vacancy.employment_type}</span>
                          )}
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
                            <span key={i} className="vacancy-card__skill">
                              {skill}
                            </span>
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
              })
            )}
          </div>
        )}

        {selectedId && (
          <div className="org-details-page">
            {!details && loadingDetails && <p className="muted">Загружаем вакансию...</p>}
            {!details && !loadingDetails && error && <p className="error">{error}</p>}
            {details && (
              <div className="org-details">
                <button className="org-detail-back" onClick={backToList} type="button">
                  ← Назад к списку
                </button>
                <div className="org-detail-hero">
                  <div className="org-detail-hero__media">
                    <div className="org-detail-hero__avatar-placeholder vacancy-placeholder">
                      {details.name ? details.name.charAt(0).toUpperCase() : "V"}
                    </div>
                  </div>
                  <div className="org-detail-hero__body">
                    <h1 className="org-detail-hero__title">{details.name}</h1>
                    <div className="vacancy-detail-meta">
                      {details.employment_type && (
                        <span className="vacancy-detail-meta__item">
                          <span className="vacancy-detail-meta__label">Тип занятости</span>
                          <span className="vacancy-detail-chip vacancy-detail-chip--type">
                            {details.employment_type}
                          </span>
                        </span>
                      )}
                      {details.created_at && (
                        <span className="vacancy-detail-meta__item">
                          <span className="vacancy-detail-meta__date-label">Опубликовано</span>{" "}
                          <span className="vacancy-detail-meta__date">{formatVacancyDate(details.created_at)}</span>
                        </span>
                      )}
                    </div>
                    {(details.organization || details.laboratory || details.query) && (
                      <div className="vacancy-detail__block">
                        <h2 className="vacancy-detail__block-title">Организация и контекст</h2>
                        <div className="org-detail-hero__meta">
                      {details.organization && (
                        <span
                          className="org-detail-hero__link"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (details.organization?.public_id) {
                              openOrg(details.organization.public_id);
                            }
                          }}
                          role={details.organization?.public_id ? "button" : undefined}
                          tabIndex={details.organization?.public_id ? 0 : undefined}
                        >
                          {details.organization.name}
                        </span>
                      )}
                      {details.laboratory && (
                        <span
                          className="org-detail-hero__link"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (details.laboratory?.public_id) {
                              openLab(details.laboratory.public_id);
                            }
                          }}
                          role={details.laboratory?.public_id ? "button" : undefined}
                          tabIndex={details.laboratory?.public_id ? 0 : undefined}
                        >
                          {details.laboratory.name}
                        </span>
                      )}
                      {details.query && (
                        <span
                          className="org-detail-hero__link"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (details.query?.public_id) {
                              openQuery(details.query.public_id);
                            }
                          }}
                          role={details.query?.public_id ? "button" : undefined}
                          tabIndex={details.query?.public_id ? 0 : undefined}
                        >
                          Запрос: {details.query.title}
                        </span>
                      )}
                        </div>
                      </div>
                    )}
                    {detailSkills.length > 0 && (
                      <div className="vacancy-detail__block">
                        <h2 className="vacancy-detail__block-title">Навыки</h2>
                        <div
                          className="vacancy-detail-skills"
                          aria-label="Навыки и ключевые требования по вакансии"
                        >
                          {detailSkills.map((skill, i) => (
                            <span key={i} className="vacancy-detail-skills__item">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {details.requirements && (
                      <div className="vacancy-detail__block">
                        <h2 className="vacancy-detail__block-title">Требования</h2>
                        <p className="vacancy-detail__text">{details.requirements}</p>
                      </div>
                    )}
                    {details.description && (
                      <div className="vacancy-detail__block">
                        <h2 className="vacancy-detail__block-title">Описание</h2>
                        <p className="vacancy-detail__text vacancy-detail__text--muted">
                          {details.description}
                        </p>
                      </div>
                    )}
                    {details.contact_employee && (
                      <div className="vacancy-contact">
                        <button
                          type="button"
                          className="vacancy-contact__card"
                          onClick={() => {
                            setEmployeePreview(details.contact_employee);
                            setShowEmployeePublications(false);
                          }}
                        >
                          <span className="vacancy-contact__avatar-wrap">
                            {details.contact_employee.photo_url ? (
                              <img
                                className="vacancy-contact__avatar"
                                src={details.contact_employee.photo_url}
                                alt=""
                              />
                            ) : (
                              <span className="vacancy-contact__avatar-placeholder">
                                {details.contact_employee.full_name
                                  ? details.contact_employee.full_name.charAt(0).toUpperCase()
                                  : "?"}
                              </span>
                            )}
                          </span>
                          <span className="vacancy-contact__body">
                            <span className="vacancy-contact__label">Контактное лицо</span>
                            <span className="vacancy-contact__name">{details.contact_employee.full_name}</span>
                            {details.contact_employee.academic_degree && (
                              <span className="vacancy-contact__meta">{details.contact_employee.academic_degree}</span>
                            )}
                            {(details.contact_employee.positions || []).length > 0 && (
                              <span className="vacancy-contact__meta">{details.contact_employee.positions.join(", ")}</span>
                            )}
                            <span className="vacancy-contact__cta">Открыть профиль →</span>
                          </span>
                        </button>
                      </div>
                    )}
                    {!details.contact_employee && (details.contact_email || details.contact_phone) && (
                      <div className="org-detail-section org-detail-section--inline">
                        <h2 className="org-detail-section__title">Контакт</h2>
                        <p className="org-detail-hero__description">
                          {details.contact_email && (
                            <span>Email: <a href={`mailto:${details.contact_email}`} className="org-detail-hero__link">{details.contact_email}</a></span>
                          )}
                          {details.contact_email && details.contact_phone && " · "}
                          {details.contact_phone && <span>Телефон: {details.contact_phone}</span>}
                        </p>
                      </div>
                    )}
                    <div className="vacancy-response">
                      {myResponse === null ? (
                        <p className="vacancy-response__loading">Загрузка…</p>
                      ) : !auth ? (
                        <Link
                          to={`/login?returnUrl=${encodeURIComponent(`/vacancies/${selectedId}`)}`}
                          className="primary-btn vacancy-response__btn"
                        >
                          Войти, чтобы откликнуться
                        </Link>
                      ) : myResponse?.has_response ? (
                        <p className="vacancy-response__status">
                          Вы откликнулись. Статус: <span className="vacancy-response__chip">{RESPONSE_STATUS_LABELS[myResponse.status] ?? myResponse.status}</span>
                        </p>
                      ) : (
                        <>
                          {respondError && (
                            <p className="auth-alert auth-alert-error" role="alert">
                              {respondError}
                            </p>
                          )}
                          <button
                            type="button"
                            className="primary-btn vacancy-response__btn"
                            onClick={handleRespond}
                            disabled={respondLoading}
                          >
                            {respondLoading ? "Отправка…" : "Откликнуться"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <EmployeeModal
        employeePreview={employeePreview}
        showEmployeePublications={showEmployeePublications}
        setShowEmployeePublications={setShowEmployeePublications}
        closeEmployeePreview={() => {
          setEmployeePreview(null);
          setShowEmployeePublications(false);
        }}
      />
    </main>
  );
}
