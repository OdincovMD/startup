import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import EmployeeModal from "./profile/EmployeeModal";

export default function Vacancies() {
  const [vacancies, setVacancies] = useState([]);
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
            <p>Опубликованные вакансии с описанием, связанными лабораториями и контактами.</p>
          </div>
        )}
        {loading && !selectedId && <p className="muted">Загружаем вакансии...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && !selectedId && (
          <div className="org-cards-grid">
            {vacancies.length === 0 ? (
              <p className="lab-empty">Опубликованные вакансии пока не добавлены.</p>
            ) : (
              vacancies.map((vacancy) => (
                <article
                  key={vacancy.id}
                  className="org-card-modern"
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
                  <div className="org-card-modern__media">
                    <div className="org-card-modern__avatar-placeholder vacancy-placeholder" aria-hidden="true">
                      {vacancy.name ? vacancy.name.charAt(0).toUpperCase() : "V"}
                    </div>
                  </div>
                  <div className="org-card-modern__body">
                    <h3 className="org-card-modern__title">{vacancy.name || "Вакансия"}</h3>
                    <div className="org-card-modern__meta">
                      {vacancy.employment_type && (
                        <span className="org-card-modern__meta-item">{vacancy.employment_type}</span>
                      )}
                      {vacancy.laboratory && (
                        <span
                          className="org-card-modern__meta-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (vacancy.laboratory?.public_id) {
                              navigate(`/laboratories/${vacancy.laboratory.public_id}`);
                            }
                          }}
                          role={vacancy.laboratory?.public_id ? "button" : undefined}
                          tabIndex={vacancy.laboratory?.public_id ? 0 : undefined}
                        >
                          {vacancy.laboratory.name}
                        </span>
                      )}
                      {vacancy.organization && (
                        <span
                          className="org-card-modern__meta-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (vacancy.organization?.public_id) {
                              navigate(`/organizations/${vacancy.organization.public_id}`);
                            }
                          }}
                          role={vacancy.organization?.public_id ? "button" : undefined}
                          tabIndex={vacancy.organization?.public_id ? 0 : undefined}
                        >
                          {vacancy.organization.name}
                        </span>
                      )}
                      {!vacancy.employment_type && !vacancy.laboratory && !vacancy.organization && (
                        <span className="org-card-modern__meta-item org-card-modern__meta-item--muted">
                          Нет данных
                        </span>
                      )}
                    </div>
                    {(vacancy.requirements || vacancy.description) && (
                      <p className="org-card-modern__description" title={vacancy.requirements || vacancy.description}>
                        {vacancy.requirements || vacancy.description}
                      </p>
                    )}
                    {vacancy.contact_employee && (
                      <div className="org-detail-card__chips org-card-modern__chips">
                        <span className="org-detail-chip">Контакт: {vacancy.contact_employee.full_name}</span>
                      </div>
                    )}
                    {vacancy.public_id && (
                      <span className="org-card-modern__cta">
                        Открыть вакансию
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
                    {details.employment_type && (
                      <p className="org-detail-hero__description org-detail-hero__description--muted">
                        {details.employment_type}
                      </p>
                    )}
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
                    {details.requirements && (
                      <p className="org-detail-hero__description">{details.requirements}</p>
                    )}
                    {details.description && (
                      <p className="org-detail-hero__description">{details.description}</p>
                    )}
                    {details.contact_employee && (
                      <div className="org-detail-section org-detail-section--inline">
                        <h2 className="org-detail-section__title">Контактное лицо</h2>
                        <div
                          className="org-detail-card org-detail-card--employee org-detail-card--clickable"
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setEmployeePreview(details.contact_employee);
                            setShowEmployeePublications(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setEmployeePreview(details.contact_employee);
                              setShowEmployeePublications(false);
                            }
                          }}
                        >
                          <div className="org-detail-card__body">
                            {details.contact_employee.photo_url ? (
                              <img
                                className="org-detail-card__avatar"
                                src={details.contact_employee.photo_url}
                                alt=""
                              />
                            ) : (
                              <div className="org-detail-card__avatar-placeholder">
                                {details.contact_employee.full_name
                                  ? details.contact_employee.full_name.charAt(0).toUpperCase()
                                  : "?"}
                              </div>
                            )}
                            <h3 className="org-detail-card__title">{details.contact_employee.full_name}</h3>
                            {details.contact_employee.academic_degree && (
                              <p className="org-detail-card__text org-detail-card__text--muted">
                                {details.contact_employee.academic_degree}
                              </p>
                            )}
                            {(details.contact_employee.positions || []).length > 0 && (
                              <p className="org-detail-card__text">
                                {details.contact_employee.positions.join(", ")}
                              </p>
                            )}
                            <span className="org-detail-card__cta">Профиль →</span>
                          </div>
                        </div>
                      </div>
                    )}
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
