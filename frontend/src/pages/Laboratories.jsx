import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import EmployeeModal from "./profile/EmployeeModal";
import GalleryModal from "./profile/GalleryModal";
import {
  LabCard,
  LabDetailHero,
  LabSection,
  LabDetailCard,
  LabGalleryGrid,
} from "../components/lab";

export default function Laboratories() {
  const [laboratories, setLaboratories] = useState([]);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [gallery, setGallery] = useState({ open: false, images: [], index: 0 });
  const [galleryZoom, setGalleryZoom] = useState(1);
  const [employeePreview, setEmployeePreview] = useState(null);
  const [showEmployeePublications, setShowEmployeePublications] = useState(false);
  const { publicId } = useParams();
  const navigate = useNavigate();
  const selectedId = useMemo(() => (publicId ? String(publicId) : null), [publicId]);

  useEffect(() => {
    async function loadLaboratories() {
      try {
        setLoading(true);
        const data = await apiRequest("/laboratories/");
        setLaboratories(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadLaboratories();
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
        const labDetails = await apiRequest(`/laboratories/public/${selectedId}/details`);
        setDetails(labDetails);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingDetails(false);
      }
    }
    loadDetails();
  }, [selectedId]);

  const openLaboratory = (publicIdValue) => {
    navigate(`/laboratories/${publicIdValue}`);
  };

  const backToList = () => {
    setError(null);
    navigate("/laboratories");
  };

  const openQuery = (publicIdValue) => {
    if (!publicIdValue) return;
    navigate(`/queries/${publicIdValue}`);
  };

  const openVacancy = (publicIdValue) => {
    if (!publicIdValue) return;
    navigate(`/vacancies/${publicIdValue}`);
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

  const labImages = (urls) => splitMedia(urls || []).images;

  const listImages = labImages(details?.image_urls ?? []);

  return (
    <main className="main lab-page">
      <section className="section" aria-label={selectedId ? "Детали лаборатории" : "Список лабораторий"}>
        {!selectedId && (
          <div className="section-header">
            <h2>Лаборатории</h2>
            <p>Научные лаборатории с описаниями, руководителями и командой. Выберите карточку, чтобы открыть детали и вакансии.</p>
          </div>
        )}
        {loading && !selectedId && (
          <div className="org-cards-grid lab-page__skeleton-grid" aria-busy="true" role="status" aria-label="Загрузка">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="org-card-modern lab-skeleton-card">
                <div className="lab-skeleton lab-skeleton--avatar" />
                <div className="lab-skeleton-card__body">
                  <div className="lab-skeleton lab-skeleton--line lab-skeleton--title" />
                  <div className="lab-skeleton lab-skeleton--line lab-skeleton--meta" />
                  <div className="lab-skeleton lab-skeleton--line lab-skeleton--desc" />
                  <div className="lab-skeleton lab-skeleton--line lab-skeleton--desc lab-skeleton--short" />
                </div>
              </div>
            ))}
          </div>
        )}
        {error && !selectedId && (
          <div className="org-detail-error-banner" role="alert">
            {error}
          </div>
        )}
        {!loading && !error && !selectedId && (
          <div className="org-cards-grid">
            {laboratories.length === 0 ? (
              <div className="lab-empty-block">
                <p className="lab-empty">Публичные лаборатории пока не добавлены.</p>
                <p className="lab-empty-hint">Организации и представители лабораторий могут добавлять лаборатории в разделе «Профиль».</p>
              </div>
            ) : (
              laboratories.map((lab) => (
                <LabCard
                  key={lab.id}
                  lab={lab}
                  labImages={labImages}
                  onOpen={openLaboratory}
                  onOrgClick={(id) => navigate(`/organizations/${id}`)}
                  navigate={navigate}
                />
              ))
            )}
          </div>
        )}
        {selectedId && (
          <div className="org-details-page" aria-busy={loadingDetails}>
            {!details && loadingDetails && (
              <div className="lab-page__detail-skeleton" role="status" aria-label="Загрузка деталей">
                <div className="lab-skeleton lab-skeleton--back" />
                <div className="lab-skeleton lab-skeleton--hero" />
              </div>
            )}
            {!details && !loadingDetails && error && (
              <div className="org-detail-error">
                <button className="org-detail-back" onClick={backToList} type="button">
                  ← Назад к списку
                </button>
                <div className="org-detail-error-banner" role="alert">
                  {error}
                </div>
              </div>
            )}
            {details && (
              <div className="org-details">
                <button className="org-detail-back" onClick={backToList} type="button">
                  ← Назад к списку
                </button>
                <LabDetailHero
                  details={details}
                  labImages={labImages}
                  onOrgClick={(id) => navigate(`/organizations/${id}`)}
                  onHeadClick={(head) => {
                    const emp = details.employees.find((e) => e.id === head.id);
                    if (emp) {
                      setEmployeePreview(emp);
                      setShowEmployeePublications(false);
                    }
                  }}
                />
                {listImages.length > 1 && (
                  <LabSection
                    title="Фотографии"
                    badge={listImages.length}
                    empty={false}
                  >
                    <LabGalleryGrid
                      images={listImages}
                      onImageClick={(index) => openGallery(listImages, index)}
                    />
                  </LabSection>
                )}
                <LabSection
                  title="Сотрудники"
                  badge={details.employees.length}
                  emptyMessage="Сотрудники не добавлены."
                  empty={details.employees.length === 0}
                >
                  <div className="org-detail-grid org-detail-grid--employees">
                    {details.employees.map((employee) => {
                      const interests = Array.isArray(employee.research_interests) ? employee.research_interests : [];
                      return (
                        <LabDetailCard
                          key={employee.id}
                          variant="employee"
                          clickable
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
                        </LabDetailCard>
                      );
                    })}
                  </div>
                </LabSection>
                <LabSection
                  title="Оборудование"
                  badge={details.equipment.length}
                  emptyMessage="Оборудование не добавлено."
                  empty={details.equipment.length === 0}
                >
                  <div className="org-detail-grid">
                    {details.equipment.map((item) => {
                      const itemImages = labImages(item.image_urls);
                      return (
                        <LabDetailCard
                          key={item.id}
                          media={itemImages[0]}
                          onMediaClick={itemImages.length > 0 ? () => openGallery(itemImages, 0) : undefined}
                          mediaBadge={itemImages.length > 1 ? itemImages.length - 1 : 0}
                        >
                          <h3 className="org-detail-card__title">{item.name}</h3>
                          {item.characteristics && (
                            <p className="org-detail-card__text">{item.characteristics}</p>
                          )}
                          {item.description && (
                            <p className="org-detail-card__text">{item.description}</p>
                          )}
                          {splitMedia(item.image_urls).docs.length > 0 && (
                            <div className="org-detail-card__files">
                              {splitMedia(item.image_urls).docs.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  {fileNameFromUrl(url)}
                                </a>
                              ))}
                            </div>
                          )}
                        </LabDetailCard>
                      );
                    })}
                  </div>
                </LabSection>
                <LabSection
                  title="Решённые задачи"
                  badge={(details.task_solutions || []).length}
                  emptyMessage="Решённые задачи не добавлены."
                  empty={(details.task_solutions || []).length === 0}
                >
                  <div className="org-detail-grid">
                    {(details.task_solutions || []).map((task) => (
                      <LabDetailCard key={task.id}>
                        <h3 className="org-detail-card__title">{task.title}</h3>
                        {(task.task_description || task.solution_description) && (
                          <p className="org-detail-card__text" title={task.task_description || task.solution_description}>
                            {(task.task_description || task.solution_description || "").length > 120
                              ? `${(task.task_description || task.solution_description || "").slice(0, 120)}…`
                              : (task.task_description || task.solution_description || "")}
                          </p>
                        )}
                        <div className="org-detail-card__meta">
                          {task.solution_deadline && <span>Сроки: {task.solution_deadline}</span>}
                          {task.grant_info && <span>Грант: {task.grant_info}</span>}
                          {task.cost && <span>Стоимость: {task.cost}</span>}
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
                      </LabDetailCard>
                    ))}
                  </div>
                </LabSection>
                <LabSection
                  title="Запросы"
                  badge={(details.queries || []).length}
                  emptyMessage="Запросы не добавлены."
                  empty={(details.queries || []).length === 0}
                >
                  <div className="org-detail-grid">
                    {(details.queries || []).map((query) => (
                      <LabDetailCard
                        key={query.id}
                        clickable={!!query.public_id}
                        onClick={() => query.public_id && openQuery(query.public_id)}
                        onKeyDown={(e) => {
                          if (query.public_id && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            openQuery(query.public_id);
                          }
                        }}
                      >
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
                        {(query.employees || []).length > 0 && (
                          <div className="org-detail-card__chips">
                            {(query.employees || []).slice(0, 3).map((emp) => (
                              <span key={emp.id} className="org-detail-chip">{emp.full_name}</span>
                            ))}
                            {(query.employees || []).length > 3 && (
                              <span className="org-detail-chip">+{(query.employees || []).length - 3}</span>
                            )}
                          </div>
                        )}
                        {query.public_id && (
                          <span className="org-detail-card__cta">Открыть запрос →</span>
                        )}
                      </LabDetailCard>
                    ))}
                  </div>
                </LabSection>
                <LabSection
                  title="Вакансии"
                  badge={(details.vacancies || []).length}
                  emptyMessage="Вакансии не добавлены."
                  empty={(details.vacancies || []).length === 0}
                >
                  <div className="org-detail-grid">
                    {(details.vacancies || []).map((vacancy) => (
                      <LabDetailCard key={vacancy.id}>
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
                        {vacancy.contact_employee && (
                          <div className="org-detail-card__meta">
                            <span>Контакт: {vacancy.contact_employee.full_name}</span>
                          </div>
                        )}
                        {vacancy.public_id && (
                          <button
                            className="org-detail-card__cta"
                            type="button"
                            onClick={() => openVacancy(vacancy.public_id)}
                          >
                            Открыть вакансию →
                          </button>
                        )}
                      </LabDetailCard>
                    ))}
                  </div>
                </LabSection>
                {splitMedia(details.image_urls).docs.length > 0 && (
                  <LabSection title="Документы" empty={false}>
                    <div className="org-detail-card__files org-detail-card__files--block">
                      {splitMedia(details.image_urls).docs.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          {fileNameFromUrl(url)}
                        </a>
                      ))}
                    </div>
                  </LabSection>
                )}
              </div>
            )}
          </div>
        )}
      </section>
      <GalleryModal
        gallery={gallery}
        galleryZoom={galleryZoom}
        closeGallery={closeGallery}
        showPrev={showPrev}
        showNext={showNext}
        handleGalleryWheel={handleGalleryWheel}
        toggleZoom={toggleZoom}
      />
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
