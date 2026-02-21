import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import EmployeeModal from "./profile/EmployeeModal";

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

  const backToList = () => {
    navigate("/queries");
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
            <p>Заявки на R&D с описанием, бюджетом и грантами. Выберите карточку, чтобы открыть детали и связанные лаборатории.</p>
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
                  className="org-card-modern"
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
                  <div className="org-card-modern__media">
                    <div className="org-card-modern__avatar-placeholder query-placeholder" aria-hidden="true">
                      {query.title ? query.title.charAt(0).toUpperCase() : "Q"}
                    </div>
                  </div>
                  <div className="org-card-modern__body">
                    <h3 className="org-card-modern__title">{query.title || "Запрос"}</h3>
                    <div className="org-card-modern__meta">
                      {query.organization && (
                        <span
                          className="org-card-modern__meta-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (query.organization?.public_id) {
                              navigate(`/organizations/${query.organization.public_id}`);
                            }
                          }}
                          role={query.organization?.public_id ? "button" : undefined}
                          tabIndex={query.organization?.public_id ? 0 : undefined}
                        >
                          {query.organization.name}
                        </span>
                      )}
                      {query.linked_task_solution && (
                        <span className="org-card-modern__meta-item org-card-modern__meta-item--muted">
                          Решённая задача: {query.linked_task_solution.title.length > 30 ? `${query.linked_task_solution.title.slice(0, 30)}…` : query.linked_task_solution.title}
                        </span>
                      )}
                      {query.grant_info && (
                        <span className="org-card-modern__meta-item">Грант: {query.grant_info.length > 25 ? `${query.grant_info.slice(0, 25)}…` : query.grant_info}</span>
                      )}
                      {query.budget && (
                        <span className="org-card-modern__meta-item">Бюджет: {query.budget}</span>
                      )}
                      {query.deadline && (
                        <span className="org-card-modern__meta-item">Дедлайн: {query.deadline}</span>
                      )}
                      {query.status && (
                        <span className="org-card-modern__meta-item org-card-modern__meta-item--status">
                          {query.status === "active" && "Активный"}
                          {query.status === "paused" && "На паузе"}
                          {query.status === "closed" && "Закрыт"}
                        </span>
                      )}
                      {!query.budget && !query.deadline && !query.organization && !query.grant_info && !query.status && (
                        <span className="org-card-modern__meta-item org-card-modern__meta-item--muted">
                          Нет данных
                        </span>
                      )}
                    </div>
                    {query.task_description && (
                      <p className="org-card-modern__description" title={query.task_description}>
                        {query.task_description.length > 140
                          ? `${query.task_description.slice(0, 140)}…`
                          : query.task_description}
                      </p>
                    )}
                    {((query.laboratories || []).length > 0 || (query.vacancies || []).length > 0) && (
                      <div className="org-detail-card__chips org-card-modern__chips">
                        {(query.laboratories || []).slice(0, 2).map((lab) => (
                          <span key={lab.id} className="org-detail-chip">
                            {lab.name}
                          </span>
                        ))}
                        {(query.vacancies || []).length > 0 && (
                          <span className="org-detail-chip">
                            {(query.vacancies || []).length} ваканс.
                          </span>
                        )}
                      </div>
                    )}
                    {query.public_id && (
                      <span className="org-card-modern__cta">
                        Открыть запрос
                        <span className="org-card-modern__cta-arrow" aria-hidden="true">→</span>
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
                <button className="org-detail-back" onClick={backToList} type="button">
                  ← Назад к списку
                </button>
                <div className="org-detail-hero">
                  <div className="org-detail-hero__media">
                    <div className="org-detail-hero__avatar-placeholder query-placeholder">
                      {details.title ? details.title.charAt(0).toUpperCase() : "Q"}
                    </div>
                  </div>
                  <div className="org-detail-hero__body">
                    <h1 className="org-detail-hero__title">{details.title}</h1>
                    <div className="org-detail-hero__meta">
                      {details.organization && (
                        <span
                          className="org-detail-hero__link"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (details.organization?.public_id) {
                              navigate(`/organizations/${details.organization.public_id}`);
                            }
                          }}
                          role={details.organization?.public_id ? "button" : undefined}
                          tabIndex={details.organization?.public_id ? 0 : undefined}
                        >
                          {details.organization.name}
                        </span>
                      )}
                      {details.status && (
                        <span className="org-detail-hero__meta-item org-detail-hero__meta-item--status">
                          {details.status === "active" && "Активный"}
                          {details.status === "paused" && "На паузе"}
                          {details.status === "closed" && "Закрыт"}
                        </span>
                      )}
                      {details.budget && (
                        <span className="org-detail-hero__meta-item">Бюджет: {details.budget}</span>
                      )}
                      {details.deadline && (
                        <span className="org-detail-hero__meta-item">Дедлайн: {details.deadline}</span>
                      )}
                      {details.grant_info && (
                        <span className="org-detail-hero__meta-item">Грант: {details.grant_info}</span>
                      )}
                    </div>
                    {((details.laboratories || []).length > 0 || (details.employees || []).length > 0 || (details.vacancies || []).length > 0) && (
                      <div className="org-detail-hero__summary">
                        {(details.laboratories || []).length > 0 && <span>Лабораторий: {(details.laboratories || []).length}</span>}
                        {(details.employees || []).length > 0 && <span>Сотрудников: {(details.employees || []).length}</span>}
                        {(details.vacancies || []).length > 0 && <span>Вакансий: {(details.vacancies || []).length}</span>}
                      </div>
                    )}
                    {details.linked_task_solution && (
                      <div className="org-detail-hero__linked-task">
                        <span className="org-detail-hero__linked-task-label">Связанная решённая задача:</span>
                        <div className="org-detail-card org-detail-card--inline">
                          <div className="org-detail-card__body">
                            <h3 className="org-detail-card__title">{details.linked_task_solution.title}</h3>
                            {(details.linked_task_solution.task_description || details.linked_task_solution.solution_description) && (
                              <p className="org-detail-card__text">
                                {(details.linked_task_solution.task_description || details.linked_task_solution.solution_description || "").length > 200
                                  ? `${(details.linked_task_solution.task_description || details.linked_task_solution.solution_description || "").slice(0, 200)}…`
                                  : (details.linked_task_solution.task_description || details.linked_task_solution.solution_description || "")}
                              </p>
                            )}
                            <div className="org-detail-card__meta">
                              {details.linked_task_solution.solution_deadline && <span>Сроки: {details.linked_task_solution.solution_deadline}</span>}
                              {details.linked_task_solution.grant_info && <span>Грант: {details.linked_task_solution.grant_info}</span>}
                              {details.linked_task_solution.cost && <span>Стоимость: {details.linked_task_solution.cost}</span>}
                            </div>
                            {(details.linked_task_solution.laboratories || []).length > 0 && (
                              <div className="org-detail-card__chips">
                                {(details.linked_task_solution.laboratories || []).slice(0, 3).map((lab) => (
                                  <span key={lab.id} className="org-detail-chip">{lab.name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {details.task_description && (
                      <p className="org-detail-hero__description">{details.task_description}</p>
                    )}
                    {details.completed_examples && (
                      <p className="org-detail-hero__description">{details.completed_examples}</p>
                    )}
                    {details.grant_info && (
                      <p className="org-detail-hero__description">Грант: {details.grant_info}</p>
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
                  <div className="org-detail-grid org-detail-grid--employees">
                    {(details.employees || []).map((employee) => (
                      <div
                        key={employee.id}
                        className="org-detail-card org-detail-card--employee org-detail-card--clickable"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setEmployeePreview(employee);
                          setShowEmployeePublications(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setEmployeePreview(employee);
                            setShowEmployeePublications(false);
                          }
                        }}
                      >
                        <div className="org-detail-card__body">
                          {employee.photo_url ? (
                            <img className="org-detail-card__avatar" src={employee.photo_url} alt="" />
                          ) : (
                            <div className="org-detail-card__avatar-placeholder">
                              {employee.full_name ? employee.full_name.charAt(0).toUpperCase() : "?"}
                            </div>
                          )}
                          <h3 className="org-detail-card__title">{employee.full_name}</h3>
                          {employee.academic_degree && (
                            <p className="org-detail-card__text org-detail-card__text--muted">
                              {employee.academic_degree}
                            </p>
                          )}
                          {(employee.positions || []).length > 0 && (
                            <p className="org-detail-card__text">{employee.positions.join(", ")}</p>
                          )}
                          <span className="org-detail-card__cta">Профиль →</span>
                        </div>
                      </div>
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
