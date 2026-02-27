import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import EmployeeModal from "./profile/EmployeeModal";

const QUERY_STATUS_LABELS = { active: "Активный", paused: "На паузе", closed: "Закрыт" };

function formatQueryDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export default function Queries() {
  const [queries, setQueries] = useState([]);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [employeePreview, setEmployeePreview] = useState(null);
  const [showEmployeePublications, setShowEmployeePublications] = useState(false);
  const { publicId } = useParams();
  const navigate = useNavigate();
  const selectedId = useMemo(() => (publicId ? String(publicId) : null), [publicId]);

  useEffect(() => {
    async function loadQueries() {
      try {
        setLoading(true);
        const data = await apiRequest("/queries/");
        setQueries(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadQueries();
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
        const q = await apiRequest(`/queries/public/${selectedId}/details`);
        setDetails(q);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingDetails(false);
      }
    }
    loadDetails();
  }, [selectedId]);

  const openQuery = (publicIdValue) => {
    navigate(`/queries/${publicIdValue}`);
  };

  const goBack = () => {
    navigate(-1);
  };

  const openLab = (publicIdValue) => {
    if (!publicIdValue) return;
    navigate(`/laboratories/${publicIdValue}`);
  };

  const openVacancy = (publicIdValue) => {
    if (!publicIdValue) return;
    navigate(`/vacancies/${publicIdValue}`);
  };

  return (
    <main className="main">
      <section className="section">
        {!selectedId && (
          <div className="section-header">
            <h2>Запросы</h2>
            <p>Заявки на R&D с описанием, бюджетом и грантами. Откройте карточку для деталей и связанных лабораторий.</p>
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
            {queries.length === 0 ? (
              <div className="lab-empty-block org-empty-block">
                <p className="lab-empty">Публичные запросы пока не добавлены.</p>
                <p className="lab-empty-hint">Организации добавляют запросы в разделе «Профиль».</p>
              </div>
            ) : (
              queries.map((query) => (
                <article
                  key={query.id}
                  className="query-card"
                  onClick={() => query.public_id && openQuery(query.public_id)}
                  role={query.public_id ? "button" : undefined}
                  tabIndex={query.public_id ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (query.public_id && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      openQuery(query.public_id);
                    }
                  }}
                >
                  <div className="query-card__accent" aria-hidden="true" />
                  <div className="query-card__inner">
                    <div className="query-card__header">
                      <span className="query-card__icon" aria-hidden="true">
                        {query.title ? query.title.charAt(0).toUpperCase() : "Q"}
                      </span>
                      <div className="query-card__headline">
                        <h3 className="query-card__title">{query.title || "Запрос"}</h3>
                        {query.status && (
                          <span className="query-card__status">{QUERY_STATUS_LABELS[query.status] ?? query.status}</span>
                        )}
                      </div>
                    </div>
                    {(query.deadline || query.budget) && (
                      <p className="query-card__meta">
                        {query.deadline && (
                          <span className="query-card__meta-item">
                            <span className="query-card__meta-label">Дедлайн</span> {formatQueryDate(query.deadline)}
                          </span>
                        )}
                        {query.budget && (
                          <span className="query-card__meta-item">
                            <span className="query-card__meta-label">Бюджет</span> {query.budget}
                          </span>
                        )}
                      </p>
                    )}
                    {query.organization && (
                      <p className="query-card__org">
                        {query.organization.public_id ? (
                          <span
                            className="query-card__org-link"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/organizations/${query.organization.public_id}`);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/organizations/${query.organization.public_id}`);
                              }
                            }}
                          >
                            {query.organization.name}
                          </span>
                        ) : (
                          <span className="query-card__org-name">{query.organization.name}</span>
                        )}
                      </p>
                    )}
                    {query.task_description && (
                      <p className="query-card__description" title={query.task_description}>
                        {query.task_description.length > 100
                          ? `${query.task_description.slice(0, 100)}…`
                          : query.task_description}
                      </p>
                    )}
                    {query.public_id && (
                      <span className="query-card__cta">
                        Открыть запрос
                        <span className="query-card__cta-arrow" aria-hidden="true">→</span>
                      </span>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {selectedId && (
          <div className="org-details-page">
            {!details && loadingDetails && <p className="muted">Загружаем запрос...</p>}
            {!details && !loadingDetails && error && <p className="error">{error}</p>}
            {details && (
              <div className="org-details">
                <button className="org-detail-back" onClick={goBack} type="button">
                  ← Назад
                </button>
                <div className="org-detail-hero">
                  <div className="org-detail-hero__media">
                    <div className="org-detail-hero__avatar-placeholder query-placeholder">
                      {details.title ? details.title.charAt(0).toUpperCase() : "Q"}
                    </div>
                  </div>
                  <div className="org-detail-hero__body">
                    <h1 className="org-detail-hero__title">{details.title}</h1>
                    <div className="query-detail-meta">
                      {details.status && (
                        <span className="query-detail-meta__item">
                          <span className="query-detail-meta__label">Статус</span>
                          <span className="query-detail-chip">{QUERY_STATUS_LABELS[details.status] ?? details.status}</span>
                        </span>
                      )}
                      {details.budget && (
                        <span className="query-detail-meta__item">
                          <span className="query-detail-meta__label">Бюджет</span>
                          <span className="query-detail-meta__value">{details.budget}</span>
                        </span>
                      )}
                      {details.deadline && (
                        <span className="query-detail-meta__item">
                          <span className="query-detail-meta__label">Дедлайн</span>
                          <span className="query-detail-meta__value">{formatQueryDate(details.deadline)}</span>
                        </span>
                      )}
                      {details.grant_info && (
                        <span className="query-detail-meta__item">
                          <span className="query-detail-meta__label">Грант</span>
                          <span className="query-detail-meta__value">{details.grant_info}</span>
                        </span>
                      )}
                    </div>
                    {details.organization && (
                      <div className="query-detail__block">
                        <h2 className="query-detail__block-title">Организация</h2>
                        <span
                          className="org-detail-hero__link query-detail__org-link"
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (details.organization?.public_id) navigate(`/organizations/${details.organization.public_id}`);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (details.organization?.public_id) navigate(`/organizations/${details.organization.public_id}`);
                            }
                          }}
                        >
                          {details.organization.name}
                        </span>
                      </div>
                    )}
                    {((details.laboratories || []).length > 0 || (details.employees || []).length > 0 || (details.vacancies || []).length > 0) && (
                      <div className="query-detail__summary">
                        {(details.laboratories || []).length > 0 && <span className="query-detail__summary-item">Лабораторий: {(details.laboratories || []).length}</span>}
                        {(details.employees || []).length > 0 && <span className="query-detail__summary-item">Сотрудников: {(details.employees || []).length}</span>}
                        {(details.vacancies || []).length > 0 && <span className="query-detail__summary-item">Вакансий: {(details.vacancies || []).length}</span>}
                      </div>
                    )}
                    {details.task_description && (
                      <div className="query-detail__block">
                        <h2 className="query-detail__block-title">Описание задачи</h2>
                        <p className="query-detail__text">{details.task_description}</p>
                      </div>
                    )}
                    {details.completed_examples && (
                      <div className="query-detail__block">
                        <h2 className="query-detail__block-title">Примеры выполнения</h2>
                        <p className="query-detail__text query-detail__text--muted">{details.completed_examples}</p>
                      </div>
                    )}
                    {details.linked_task_solution && (
                      <div className="query-detail__block">
                        <h2 className="query-detail__block-title">Связанная решённая задача</h2>
                        <div className="query-detail__linked-task">
                          <h3 className="query-detail__linked-task-title">{details.linked_task_solution.title}</h3>
                          {(details.linked_task_solution.task_description || details.linked_task_solution.solution_description) && (
                            <p className="query-detail__text">
                              {(details.linked_task_solution.task_description || details.linked_task_solution.solution_description || "").length > 200
                                ? `${(details.linked_task_solution.task_description || details.linked_task_solution.solution_description || "").slice(0, 200)}…`
                                : (details.linked_task_solution.task_description || details.linked_task_solution.solution_description || "")}
                            </p>
                          )}
                          <div className="query-detail__linked-task-meta">
                            {details.linked_task_solution.solution_deadline && <span>Сроки: {details.linked_task_solution.solution_deadline}</span>}
                            {details.linked_task_solution.grant_info && <span>Грант: {details.linked_task_solution.grant_info}</span>}
                            {details.linked_task_solution.cost && <span>Стоимость: {details.linked_task_solution.cost}</span>}
                          </div>
                          {(details.linked_task_solution.laboratories || []).length > 0 && (
                            <div className="query-detail-skills">
                              {(details.linked_task_solution.laboratories || []).slice(0, 3).map((lab) => (
                                <span key={lab.id} className="query-detail-skills__item">{lab.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="org-detail-section">
                  <h2 className="org-detail-section__title">
                    Лаборатории
                    <span className="org-detail-section__badge">{(details.laboratories || []).length}</span>
                  </h2>
                  {(details.laboratories || []).length === 0 && (
                    <p className="org-detail-section__empty">Лаборатории не связаны с этим запросом.</p>
                  )}
                  <div className="org-detail-grid">
                    {(details.laboratories || []).map((lab) => (
                      <div key={lab.id} className="org-detail-card">
                        <div className="org-detail-card__body">
                          <h3 className="org-detail-card__title">{lab.name}</h3>
                          {lab.activities && (
                            <p className="org-detail-card__text">{lab.activities}</p>
                          )}
                          {lab.public_id && (
                            <button
                              className="org-detail-card__cta"
                              type="button"
                              onClick={() => openLab(lab.public_id)}
                            >
                              Открыть лабораторию →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="org-detail-section">
                  <h2 className="org-detail-section__title">
                    Ответственные сотрудники
                    <span className="org-detail-section__badge">{(details.employees || []).length}</span>
                  </h2>
                  {(details.employees || []).length === 0 && (
                    <p className="org-detail-section__empty">Сотрудники не указаны.</p>
                  )}
                  <div className="query-contacts">
                    {(details.employees || []).map((employee) => (
                      <button
                        key={employee.id}
                        type="button"
                        className="query-contact__card"
                        onClick={() => {
                          setEmployeePreview(employee);
                          setShowEmployeePublications(false);
                        }}
                      >
                        <span className="query-contact__avatar-wrap">
                          {employee.photo_url ? (
                            <img className="query-contact__avatar" src={employee.photo_url} alt="" />
                          ) : (
                            <span className="query-contact__avatar-placeholder">
                              {employee.full_name ? employee.full_name.charAt(0).toUpperCase() : "?"}
                            </span>
                          )}
                        </span>
                        <span className="query-contact__body">
                          <span className="query-contact__name">{employee.full_name}</span>
                          {employee.academic_degree && (
                            <span className="query-contact__meta">{employee.academic_degree}</span>
                          )}
                          {(employee.positions || []).length > 0 && (
                            <span className="query-contact__meta">{employee.positions.join(", ")}</span>
                          )}
                          <span className="query-contact__cta">Открыть профиль →</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="org-detail-section">
                  <h2 className="org-detail-section__title">
                    Вакансии
                    <span className="org-detail-section__badge">{(details.vacancies || []).length}</span>
                  </h2>
                  {(details.vacancies || []).length === 0 && (
                    <p className="org-detail-section__empty">Связанных опубликованных вакансий нет.</p>
                  )}
                  <div className="org-detail-grid">
                    {(details.vacancies || []).map((vacancy) => (
                      <div key={vacancy.id} className="org-detail-card">
                        <div className="org-detail-card__body">
                          <h3 className="org-detail-card__title">{vacancy.name}</h3>
                          {vacancy.employment_type && (
                            <p className="org-detail-card__text org-detail-card__text--muted">
                              {vacancy.employment_type}
                            </p>
                          )}
                          {vacancy.description && (
                            <p className="org-detail-card__text">{vacancy.description}</p>
                          )}
                          <div className="org-detail-card__meta">
                            {vacancy.laboratory && (
                              <span>Лаборатория: {vacancy.laboratory.name}</span>
                            )}
                            {vacancy.contact_employee && (
                              <span>Контакт: {vacancy.contact_employee.full_name}</span>
                            )}
                          </div>
                          {vacancy.public_id && (
                            <button
                              className="org-detail-card__cta"
                              type="button"
                              onClick={() => openVacancy(vacancy.public_id)}
                            >
                              Открыть вакансию →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
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
