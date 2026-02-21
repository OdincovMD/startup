import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import WebsiteLink from "../components/WebsiteLink";

export default function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [detailsMap, setDetailsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gallery, setGallery] = useState({ open: false, images: [], index: 0 });
  const [galleryZoom, setGalleryZoom] = useState(1);
  const [employeePreview, setEmployeePreview] = useState(null);
  const [showEmployeePublications, setShowEmployeePublications] = useState(false);
  const [showEmployeeEducation, setShowEmployeeEducation] = useState(false);
  const { publicId } = useParams();
  const navigate = useNavigate();
  const selectedId = useMemo(() => (publicId ? String(publicId) : null), [publicId]);

  useEffect(() => {
    async function loadOrganizations() {
      try {
        setLoading(true);
        const data = await apiRequest("/labs/");
        setOrganizations(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadOrganizations();
  }, []);

  useEffect(() => {
    async function loadDetails() {
      if (!selectedId || detailsMap[selectedId]) return;
      try {
        const details = await apiRequest(`/labs/public/${selectedId}/details`);
        setDetailsMap((prev) => ({ ...prev, [selectedId]: details }));
      } catch (e) {
        setError(e.message);
      }
    }
    loadDetails();
  }, [selectedId, detailsMap]);

  const openOrganization = (publicIdValue) => {
    navigate(`/organizations/${publicIdValue}`);
  };

  const backToList = () => {
    setError(null);
    navigate("/organizations");
  };

  const openGallery = (images, index = 0) => {
    if (!images || images.length === 0) return;
    setGallery({ open: true, images, index });
    setGalleryZoom(1);
  };

  const closeGallery = () => {
    setGallery({ open: false, images: [], index: 0 });
    setGalleryZoom(1);
  };

  const showPrev = () => {
    setGallery((prev) => ({
      ...prev,
      index: (prev.index - 1 + prev.images.length) % prev.images.length,
    }));
  };

  const showNext = () => {
    setGallery((prev) => ({
      ...prev,
      index: (prev.index + 1) % prev.images.length,
    }));
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const zoomBy = (delta) => {
    setGalleryZoom((prev) => {
      const next = Number((prev + delta).toFixed(2));
      return clamp(next, 1, 3);
    });
  };

  const toggleZoom = () => {
    setGalleryZoom((prev) => (prev > 1 ? 1 : 1.6));
  };

  const handleGalleryWheel = (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? -0.1 : 0.1);
  };

  useEffect(() => {
    if (!gallery.open) return;
    const onKeyDown = (event) => {
      if (event.key === "ArrowRight") {
        showNext();
      } else if (event.key === "ArrowLeft") {
        showPrev();
      } else if (event.key === "Escape") {
        closeGallery();
      } else if (event.key === "+" || event.key === "=") {
        zoomBy(0.1);
      } else if (event.key === "-" || event.key === "_") {
        zoomBy(-0.1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gallery.open]);

  const splitMedia = (urls) => {
    const list = Array.isArray(urls) ? urls : [];
    const images = [];
    const docs = [];
    list.forEach((url) => {
      if (!url) return;
      const clean = url.split("?")[0].toLowerCase();
      if (clean.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/)) {
        images.push(url);
      } else {
        docs.push(url);
      }
    });
    return { images, docs };
  };

  const fileNameFromUrl = (url) => {
    try {
      const withoutQuery = url.split("?")[0];
      const parts = withoutQuery.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch {
      return url;
    }
  };

  const openLab = (publicIdValue) => {
    if (!publicIdValue) return;
    navigate(`/laboratories/${publicIdValue}`);
  };

  const openQuery = (publicIdValue) => {
    if (!publicIdValue) return;
    navigate(`/queries/${publicIdValue}`);
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
            <h2>Организации</h2>
            <p>Научные организации с лабораториями, сотрудниками и вакансиями. Выберите карточку, чтобы открыть профиль.</p>
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
                  <div className="skeleton" aria-hidden="true" style={{ height: "0.875rem" }} />
                </div>
              </article>
            ))}
          </div>
        )}
        {error && !selectedId && (
          <div className="org-detail-error-banner" role="alert">
            {error}
          </div>
        )}
        {error && selectedId && (
          <div className="org-details-page">
            <div className="org-detail-error">
              <button className="org-detail-back" onClick={backToList} type="button">
                ← Назад к списку
              </button>
              <div className="org-detail-error-banner" role="alert">
                {error}
              </div>
            </div>
          </div>
        )}
        {!loading && !error && !selectedId && (
          <div className="org-cards-grid">
            {organizations.length === 0 ? (
              <div className="lab-empty-block org-empty-block">
                <p className="lab-empty">Публичные организации пока не добавлены.</p>
                <p className="lab-empty-hint">Организации могут создавать профиль и публиковать его в разделе «Профиль».</p>
              </div>
            ) : organizations.map((org) => (
              <article
                key={org.id}
                className="org-card-modern"
                onClick={() => org.public_id && openOrganization(org.public_id)}
                role={org.public_id ? "button" : undefined}
                tabIndex={org.public_id ? 0 : undefined}
                onKeyDown={(e) => {
                  if (org.public_id && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    openOrganization(org.public_id);
                  }
                }}
              >
                <div className="org-card-modern__media">
                  {org.avatar_url ? (
                    <img
                      className="org-card-modern__avatar"
                      src={org.avatar_url}
                      alt=""
                      loading="lazy"
                    />
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
                        {org.address}
                      </span>
                    )}
                    {org.website && (
                      <span
                        className="org-card-modern__meta-item"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <WebsiteLink url={org.website} className="org-card-modern__link" />
                      </span>
                    )}
                    {!org.address && !org.website && (
                      <span className="org-card-modern__meta-item org-card-modern__meta-item--muted">
                        Нет контактов
                      </span>
                    )}
                  </div>
                  {org.description && (
                    <p className="org-card-modern__description" title={org.description}>
                      {org.description.length > 140
                        ? `${org.description.slice(0, 140)}…`
                        : org.description}
                    </p>
                  )}
                  {org.public_id && (
                    <span className="org-card-modern__cta">
                      Открыть профиль
                      <span className="org-card-modern__cta-arrow" aria-hidden="true">→</span>
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && !error && selectedId && (
          <div className="org-details-page">
            {!detailsMap[selectedId] && <p className="muted">Загружаем профиль...</p>}
            {detailsMap[selectedId] && (
              <div className="org-details">
                <button className="org-detail-back" onClick={backToList} type="button">
                  ← Назад к списку
                </button>
                <div className="org-detail-hero">
                  <div className="org-detail-hero__media">
                    {detailsMap[selectedId].avatar_url ? (
                      <img
                        className="org-detail-hero__avatar"
                        src={detailsMap[selectedId].avatar_url}
                        alt=""
                      />
                    ) : (
                      <div className="org-detail-hero__avatar-placeholder">
                        {detailsMap[selectedId].name
                          ? detailsMap[selectedId].name.charAt(0).toUpperCase()
                          : "?"}
                      </div>
                    )}
                  </div>
                  <div className="org-detail-hero__body">
                    <h1 className="org-detail-hero__title">{detailsMap[selectedId].name}</h1>
                    <div className="org-detail-hero__meta">
                      {detailsMap[selectedId].address && (
                        <span className="org-detail-hero__meta-item">{detailsMap[selectedId].address}</span>
                      )}
                      {detailsMap[selectedId].website && (
                        <span
                          className="org-detail-hero__meta-item"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <WebsiteLink url={detailsMap[selectedId].website} className="org-detail-hero__link" />
                        </span>
                      )}
                    </div>
                    <div className="org-detail-hero__summary">
                      <span>Лабораторий: {detailsMap[selectedId].laboratories.length}</span>
                      <span>Сотрудников: {detailsMap[selectedId].employees.length}</span>
                      <span>Вакансий: {detailsMap[selectedId].vacancies.length}</span>
                    </div>
                    {detailsMap[selectedId].description && (
                      <p className="org-detail-hero__description">{detailsMap[selectedId].description}</p>
                    )}
                  </div>
                </div>
                <div className="org-detail-section">
                  <h2 className="org-detail-section__title">
                    Лаборатории
                    <span className="org-detail-section__badge">{detailsMap[selectedId].laboratories.length}</span>
                  </h2>
                  {detailsMap[selectedId].laboratories.length === 0 && (
                    <p className="org-detail-section__empty">Лаборатории не добавлены.</p>
                  )}
                  <div className="org-detail-grid">
                    {detailsMap[selectedId].laboratories.map((lab) => (
                      <div key={lab.id} className="org-detail-card">
                        {splitMedia(lab.image_urls).images.length > 0 && (
                          <button
                            type="button"
                            className="org-detail-card__media"
                            onClick={() => openGallery(splitMedia(lab.image_urls).images, 0)}
                          >
                            <img src={splitMedia(lab.image_urls).images[0]} alt="" />
                            {splitMedia(lab.image_urls).images.length > 1 && (
                              <span className="org-detail-card__media-badge">
                                +{splitMedia(lab.image_urls).images.length - 1}
                              </span>
                            )}
                          </button>
                        )}
                        <div className="org-detail-card__body">
                          <h3 className="org-detail-card__title">{lab.name}</h3>
                          {lab.head_employee && (
                            <p className="org-detail-card__meta org-detail-card__meta--head">
                              Руководитель: {lab.head_employee.full_name}
                            </p>
                          )}
                          {lab.activities && <p className="org-detail-card__text">{lab.activities}</p>}
                          {lab.description && <p className="org-detail-card__text">{lab.description}</p>}
                          {(lab.employees || []).length > 0 && (
                            <div className="org-detail-card__chips">
                              {lab.employees.slice(0, 3).map((emp) => (
                                <span key={emp.id} className="org-detail-chip">{emp.full_name}</span>
                              ))}
                              {lab.employees.length > 3 && (
                                <span className="org-detail-chip">+{lab.employees.length - 3}</span>
                              )}
                            </div>
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
                          {splitMedia(lab.image_urls).docs.length > 0 && (
                            <div className="org-detail-card__files">
                              {splitMedia(lab.image_urls).docs.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  {fileNameFromUrl(url)}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="org-detail-section">
                  <h2 className="org-detail-section__title">
                    Оборудование
                    <span className="org-detail-section__badge">{detailsMap[selectedId].equipment.length}</span>
                  </h2>
                  {detailsMap[selectedId].equipment.length === 0 && (
                    <p className="org-detail-section__empty">Оборудование не добавлено.</p>
                  )}
                  <div className="org-detail-grid">
                    {detailsMap[selectedId].equipment.map((item) => (
                      <div key={item.id} className="org-detail-card">
                        {splitMedia(item.image_urls).images.length > 0 && (
                          <button
                            type="button"
                            className="org-detail-card__media"
                            onClick={() => openGallery(splitMedia(item.image_urls).images, 0)}
                          >
                            <img src={splitMedia(item.image_urls).images[0]} alt="" />
                            {splitMedia(item.image_urls).images.length > 1 && (
                              <span className="org-detail-card__media-badge">
                                +{splitMedia(item.image_urls).images.length - 1}
                              </span>
                            )}
                          </button>
                        )}
                        <div className="org-detail-card__body">
                          <h3 className="org-detail-card__title">{item.name}</h3>
                          {item.characteristics && <p className="org-detail-card__text">{item.characteristics}</p>}
                          {item.description && <p className="org-detail-card__text">{item.description}</p>}
                          {splitMedia(item.image_urls).docs.length > 0 && (
                            <div className="org-detail-card__files">
                              {splitMedia(item.image_urls).docs.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  {fileNameFromUrl(url)}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="org-detail-section">
                  <h2 className="org-detail-section__title">
                    Сотрудники
                    <span className="org-detail-section__badge">{detailsMap[selectedId].employees.length}</span>
                  </h2>
                  {detailsMap[selectedId].employees.length === 0 && (
                    <p className="org-detail-section__empty">Сотрудники не добавлены.</p>
                  )}
                  <div className="org-detail-grid org-detail-grid--employees">
                    {detailsMap[selectedId].employees.map((employee) => {
                      const interests = Array.isArray(employee.research_interests) ? employee.research_interests : [];
                      return (
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
                              <img
                                className="org-detail-card__avatar"
                                src={employee.photo_url}
                                alt=""
                              />
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
                              <p className="org-detail-card__text org-detail-card__text--positions">
                                {employee.positions.join(", ")}
                              </p>
                            )}
                            {interests.length > 0 && (
                              <div className="org-detail-card__chips org-detail-card__chips--interests">
                                {interests.slice(0, 3).map((interest) => (
                                  <span key={interest} className="org-detail-chip">{interest}</span>
                                ))}
                                {interests.length > 3 && <span className="org-detail-chip">+{interests.length - 3}</span>}
                              </div>
                            )}
                            <span className="org-detail-card__cta">Профиль →</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="org-detail-section">
                  <h2 className="org-detail-section__title">
                    Решённые задачи
                    <span className="org-detail-section__badge">{detailsMap[selectedId].task_solutions.length}</span>
                  </h2>
                  {detailsMap[selectedId].task_solutions.length === 0 && (
                    <p className="org-detail-section__empty">Задачи не добавлены.</p>
                  )}
                  <div className="org-detail-grid">
                    {detailsMap[selectedId].task_solutions.map((task) => (
                      <div key={task.id} className="org-detail-card">
                        <div className="org-detail-card__body">
                          <h3 className="org-detail-card__title">{task.title}</h3>
                          {(task.task_description || task.solution_description) && (
                            <p className="org-detail-card__text" title={task.task_description || task.solution_description}>
                              {(task.task_description || task.solution_description || "").length > 120
                                ? `${(task.task_description || task.solution_description || "").slice(0, 120)}…`
                                : (task.task_description || task.solution_description || "")}
                            </p>
                          )}
                          {(task.article_links || []).length > 0 && (
                            <div className="org-detail-card__files">
                              {task.article_links.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  {url}
                                </a>
                              ))}
                            </div>
                          )}
                          <div className="org-detail-card__meta">
                            {task.solution_deadline && <span>Сроки: {task.solution_deadline}</span>}
                            {task.grant_info && <span>Грант: {task.grant_info}</span>}
                            {task.cost && <span>Стоимость: {task.cost}</span>}
                            {task.external_solutions && (
                              <span>Альтернативы: {task.external_solutions}</span>
                            )}
                          </div>
                          {(task.laboratories || []).length > 0 && (
                            <div className="org-detail-card__chips">
                              {(task.laboratories || []).slice(0, 3).map((lab) => (
                                <span key={lab.id} className="org-detail-chip">{lab.name}</span>
                              ))}
                              {(task.laboratories || []).length > 3 && (
                                <span className="org-detail-chip">+{(task.laboratories || []).length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="org-detail-section">
                  <h2 className="org-detail-section__title">
                    Запросы
                    <span className="org-detail-section__badge">{detailsMap[selectedId].queries.length}</span>
                  </h2>
                  {detailsMap[selectedId].queries.length === 0 && (
                    <p className="org-detail-section__empty">Запросы не добавлены.</p>
                  )}
                  <div className="org-detail-grid">
                    {detailsMap[selectedId].queries.map((query) => (
                      <div
                        key={query.id}
                        className="org-detail-card org-detail-card--clickable org-detail-card--query"
                        role={query.public_id ? "button" : undefined}
                        tabIndex={query.public_id ? 0 : undefined}
                        onClick={() => query.public_id && openQuery(query.public_id)}
                        onKeyDown={(e) => {
                          if (query.public_id && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            openQuery(query.public_id);
                          }
                        }}
                      >
                        <div className="org-detail-card__body">
                          <h3 className="org-detail-card__title">{query.title}</h3>
                          {query.status && (
                            <span className="org-detail-chip org-detail-chip--status">
                              {query.status === "active" && "Активный"}
                              {query.status === "paused" && "На паузе"}
                              {query.status === "closed" && "Закрыт"}
                            </span>
                          )}
                          {query.task_description && (
                            <p className="org-detail-card__text" title={query.task_description}>
                              {query.task_description.length > 120
                                ? `${query.task_description.slice(0, 120)}…`
                                : query.task_description}
                            </p>
                          )}
                          <div className="org-detail-card__meta">
                            {query.grant_info && <span>Грант: {query.grant_info}</span>}
                            {query.budget && <span>Бюджет: {query.budget}</span>}
                            {query.deadline && <span>Дедлайн: {query.deadline}</span>}
                          </div>
                          {((query.laboratories || []).length > 0 || (query.employees || []).length > 0) && (
                            <div className="org-detail-card__chips">
                              {(query.laboratories || []).slice(0, 2).map((lab) => (
                                <span key={lab.id} className="org-detail-chip">{lab.name}</span>
                              ))}
                              {(query.employees || []).slice(0, 2).map((emp) => (
                                <span key={emp.id} className="org-detail-chip">{emp.full_name}</span>
                              ))}
                            </div>
                          )}
                          {query.public_id && (
                            <span className="org-detail-card__cta">Открыть запрос →</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="org-detail-section">
                  <h2 className="org-detail-section__title">
                    Вакансии
                    <span className="org-detail-section__badge">{detailsMap[selectedId].vacancies.length}</span>
                  </h2>
                  {detailsMap[selectedId].vacancies.length === 0 && (
                    <p className="org-detail-section__empty">Вакансии не добавлены.</p>
                  )}
                  <div className="org-detail-grid">
                    {detailsMap[selectedId].vacancies.map((vacancy) => (
                      <div key={vacancy.id} className="org-detail-card">
                        <div className="org-detail-card__body">
                          <h3 className="org-detail-card__title">{vacancy.name}</h3>
                          {vacancy.employment_type && (
                            <p className="org-detail-card__text org-detail-card__text--muted">
                              {vacancy.employment_type}
                            </p>
                          )}
                          {vacancy.requirements && (
                            <p className="org-detail-card__text">{vacancy.requirements}</p>
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
      {gallery.open && (
        <div className="gallery-overlay" onClick={closeGallery}>
          <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
            <button className="gallery-close" onClick={closeGallery} aria-label="Закрыть">
              ×
            </button>
            <div className="gallery-body">
              <button className="gallery-nav" onClick={showPrev} aria-label="Предыдущее">
                ←
              </button>
              <div className="gallery-image-wrap" onWheel={handleGalleryWheel}>
                <img
                  className="gallery-image"
                  src={gallery.images[gallery.index]}
                  alt="Галерея"
                  style={{
                    transform: `scale(${galleryZoom})`,
                    cursor: galleryZoom > 1 ? "zoom-out" : "zoom-in",
                  }}
                  onClick={toggleZoom}
                />
              </div>
              <button className="gallery-nav" onClick={showNext} aria-label="Следующее">
                →
              </button>
            </div>
            <button className="gallery-zoom" onClick={toggleZoom}>
              {galleryZoom > 1 ? "Уменьшить" : "Увеличить"}
            </button>
            <div className="gallery-counter">
              {gallery.index + 1} / {gallery.images.length}
            </div>
          </div>
        </div>
      )}
      {employeePreview && (
        <div
          className="gallery-overlay"
          onClick={() => {
            setEmployeePreview(null);
            setShowEmployeePublications(false);
            setShowEmployeeEducation(false);
          }}
        >
          <div className="employee-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="gallery-close"
              onClick={() => {
                setEmployeePreview(null);
                setShowEmployeePublications(false);
                setShowEmployeeEducation(false);
              }}
              aria-label="Закрыть"
            >
              ×
            </button>
            {employeePreview.photo_url && (
              <img className="employee-avatar-lg" src={employeePreview.photo_url} alt={employeePreview.full_name} />
            )}
            <div className="employee-title">{employeePreview.full_name}</div>
            {employeePreview.academic_degree && (
              <div className="employee-subtitle">{employeePreview.academic_degree}</div>
            )}
            {(employeePreview.positions || []).length > 0 && (
              <div className="employee-subtitle">{employeePreview.positions.join(", ")}</div>
            )}
            {(employeePreview.research_interests || []).length > 0 && (
              <div className="employee-block">
                <div className="profile-label">Научные интересы</div>
                <div className="profile-list-text">
                  {employeePreview.research_interests.join(", ")}
                </div>
              </div>
            )}
            {(employeePreview.laboratories || []).length > 0 && (
              <div className="employee-block">
                <div className="profile-label">Лаборатории</div>
                <div className="chip-row">
                  {employeePreview.laboratories.map((lab) => (
                    <span key={lab.id} className="chip">
                      {lab.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(employeePreview.education || []).length > 0 && (
              <div className="employee-block">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setShowEmployeeEducation((prev) => !prev)}
                >
                  {showEmployeeEducation ? "Скрыть образование" : "Образование"}
                  <span className="employee-collapse-badge">({employeePreview.education.length})</span>
                </button>
                {showEmployeeEducation && (
                  <ul className="employee-list">
                    {employeePreview.education.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="employee-block">
              <div className="profile-label">Индексы Хирша</div>
              <div className="employee-metrics">
                <span>WoS: {employeePreview.hindex_wos ?? "—"}</span>
                <span>Scopus: {employeePreview.hindex_scopus ?? "—"}</span>
                <span>РИНЦ: {employeePreview.hindex_rsci ?? "—"}</span>
              </div>
            </div>
            {employeePreview.contacts && (
              <div className="employee-block">
                <div className="profile-label">Контакты</div>
                <div className="employee-contacts">
                  {employeePreview.contacts.email && <div>{employeePreview.contacts.email}</div>}
                  {employeePreview.contacts.phone && <div>{employeePreview.contacts.phone}</div>}
                  {employeePreview.contacts.website && (
                    <WebsiteLink url={employeePreview.contacts.website} className="file-link" />
                  )}
                  {employeePreview.contacts.telegram && (
                    <div>{employeePreview.contacts.telegram}</div>
                  )}
                </div>
              </div>
            )}
            {(employeePreview.publications || []).length > 0 && (
              <div className="employee-block">
                <button
                  className="ghost-btn"
                  onClick={() => setShowEmployeePublications((prev) => !prev)}
                >
                  {showEmployeePublications ? "Скрыть публикации" : "Публикации"}
                  <span className="employee-collapse-badge">({employeePreview.publications.length})</span>
                </button>
                {showEmployeePublications && (
                  <ul className="employee-list">
                    {employeePreview.publications.map((pub, index) => (
                      <li key={`pub-${index}`}>
                        {pub.link ? (
                          <a href={pub.link} target="_blank" rel="noreferrer" className="employee-pub-link">
                            {pub.title || "Ссылка"}
                          </a>
                        ) : (
                          <div>{pub.title}</div>
                        )}
                        {pub.source && <div className="profile-list-text">{pub.source}</div>}
                        {pub.notes && <div className="profile-list-text">{pub.notes}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
