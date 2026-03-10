import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import WebsiteLink from "../components/WebsiteLink";
import {
  OrganizationCard,
  OrganizationDetailHero,
  OrganizationSection,
  OrganizationDetailCard,
} from "../components/organization";
import EmptySearchFallback from "../components/EmptySearchFallback";

const SEARCH_DEBOUNCE_MS = 350;
const SUGGEST_DEBOUNCE_MS = 180;
const ORGANIZATIONS_PAGE_SIZE = 20;

export default function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [detailsMap, setDetailsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [minLaboratories, setMinLaboratories] = useState("");
  const [minEmployees, setMinEmployees] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState("date_desc");
  const [suggestionApplied, setSuggestionApplied] = useState(false);
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);
  const [gallery, setGallery] = useState({ open: false, images: [], index: 0 });
  const [galleryZoom, setGalleryZoom] = useState(1);
  const [employeePreview, setEmployeePreview] = useState(null);
  const [showEmployeePublications, setShowEmployeePublications] = useState(false);
  const [showEmployeeEducation, setShowEmployeeEducation] = useState(false);
  const [emptySuggestions, setEmptySuggestions] = useState([]);
  const [emptySuggestionsLoading, setEmptySuggestionsLoading] = useState(false);
  const { publicId } = useParams();
  const navigate = useNavigate();
  const selectedId = useMemo(() => (publicId ? String(publicId) : null), [publicId]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      setSuggestionsVisible(false);
      return;
    }
    setSuggestionsVisible(true);
    setSuggestionsLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const data = await apiRequest(`/labs/suggest?q=${encodeURIComponent(q)}&limit=10`);
        if (!cancelled) {
          setSuggestions(data?.suggestions || []);
          setHighlightedIndex(-1);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery]);

  const hideSuggestions = useCallback(() => {
    setSuggestionsVisible(false);
    setHighlightedIndex(-1);
  }, []);

  const applySuggestion = useCallback((text) => {
    setSearchQuery(text);
    setSuggestionApplied(true);
    hideSuggestions();
    searchInputRef.current?.focus();
  }, [hideSuggestions]);

  useEffect(() => {
    if (!suggestionApplied) return;
    const t = setTimeout(() => setSuggestionApplied(false), 450);
    return () => clearTimeout(t);
  }, [suggestionApplied]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target) &&
        !e.target.closest("[data-org-suggestions]")
      ) {
        hideSuggestions();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hideSuggestions]);

  const hasFilters =
    searchDebounced ||
    (minLaboratories !== "" && Number(minLaboratories) > 0) ||
    (minEmployees !== "" && Number(minEmployees) > 0);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, minLaboratories, minEmployees]);

  useEffect(() => {
    if (selectedId) hideSuggestions();
  }, [selectedId, hideSuggestions]);

  const resetFilters = () => {
    setSearchQuery("");
    setSearchDebounced("");
    setMinLaboratories("");
    setMinEmployees("");
    setPage(1);
    hideSuggestions();
  };

  useEffect(() => {
    if (!hasFilters || organizations.length > 0 || loading) {
      setEmptySuggestions([]);
      setEmptySuggestionsLoading(false);
      return;
    }
    let cancelled = false;
    setEmptySuggestionsLoading(true);
    (async () => {
      try {
        const data = await apiRequest(
          `/home/empty-suggestions?type=organizations&limit=12`
        );
        if (!cancelled) {
          setEmptySuggestions(data?.items ?? []);
        }
      } catch {
        if (!cancelled) setEmptySuggestions([]);
      } finally {
        if (!cancelled) setEmptySuggestionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasFilters, organizations.length, loading]);

  useEffect(() => {
    async function loadOrganizations() {
      try {
        setLoading(true);
        if (!hasFilters) {
          const data = await apiRequest("/labs/");
          const items = data?.items ?? [];
          setOrganizations(items);
          setTotal(data?.total ?? items.length);
        } else {
          const params = new URLSearchParams();
          params.set("page", String(page));
          params.set("size", String(ORGANIZATIONS_PAGE_SIZE));
          if (searchDebounced) params.set("q", searchDebounced);
          const minLabs = minLaboratories !== "" ? Number(minLaboratories) : null;
          if (minLabs != null && minLabs > 0) params.set("min_laboratories", String(minLabs));
          const minEmp = minEmployees !== "" ? Number(minEmployees) : null;
          if (minEmp != null && minEmp > 0) params.set("min_employees", String(minEmp));
          if (sortBy && sortBy !== "date_desc") params.set("sort_by", sortBy);
          const data = await apiRequest(`/labs/?${params.toString()}`);
          const items = data?.items || [];
          setOrganizations(items);
          setTotal(data?.total ?? items.length);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadOrganizations();
  }, [hasFilters, searchDebounced, minLaboratories, minEmployees, page, sortBy]);

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

  const goBack = () => {
    setError(null);
    navigate(-1);
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
          <>
            <div className="section-header section-header--search">
              <h2>Организации</h2>
              <p>Научные организации с лабораториями, сотрудниками и вакансиями. Выберите карточку, чтобы открыть профиль.</p>
              <div className="search-toolbar">
                <div className="lab-search vacancy-search" ref={searchWrapRef}>
                  <div className="vacancy-search__field">
                  <div className={`vacancy-search__bar ${loading ? "vacancy-search__bar--loading" : ""} ${suggestionApplied ? "vacancy-search__bar--applied" : ""}`}>
                    <span className="vacancy-search__icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                    </span>
                    <input
                      ref={searchInputRef}
                      type="search"
                      className="vacancy-search__input"
                      placeholder="Название, описание, ROR ID, лаборатории, сотрудники, оборудование…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchQuery.trim().length >= 2 && setSuggestionsVisible(true)}
                      onKeyDown={(e) => {
                        if (!suggestionsVisible || suggestions.length === 0) return;
                        if (e.key === "Escape") {
                          e.preventDefault();
                          hideSuggestions();
                          return;
                        }
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : -1));
                          return;
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlightedIndex((i) => (i <= 0 ? -1 : i - 1));
                          return;
                        }
                        if (e.key === "Enter") {
                          if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
                            e.preventDefault();
                            applySuggestion(suggestions[highlightedIndex]);
                          } else {
                            hideSuggestions();
                          }
                          return;
                        }
                      }}
                      aria-label="Поиск по организациям"
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-expanded={suggestionsVisible && suggestions.length > 0}
                      aria-controls="org-suggestions-list"
                      aria-activedescendant={highlightedIndex >= 0 ? `org-suggestion-${highlightedIndex}` : undefined}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="vacancy-search__clear"
                        onClick={() => setSearchQuery("")}
                        aria-label="Очистить поиск"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {suggestionsVisible && (suggestions.length > 0 || suggestionsLoading) && (
                    <div
                      data-org-suggestions
                      className="vacancy-search__suggestions vacancy-search__suggestions--dropdown"
                      role="listbox"
                      id="org-suggestions-list"
                    >
                      {suggestionsLoading ? (
                        <div className="vacancy-search__suggestion-item vacancy-search__suggestion-item--loading">
                          Загрузка…
                        </div>
                      ) : suggestions.length === 0 ? (
                        <div className="vacancy-search__suggestion-item vacancy-search__suggestion-item--loading">
                          Нет подсказок
                        </div>
                      ) : (
                        suggestions.map((text, i) => (
                          <div
                            key={i}
                            role="option"
                            id={`org-suggestion-${i}`}
                            className={`vacancy-search__suggestion-item ${i === highlightedIndex ? "vacancy-search__suggestion-item--highlighted" : ""}`}
                            onClick={() => applySuggestion(text)}
                            onMouseEnter={() => setHighlightedIndex(i)}
                          >
                            {text}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  </div>
                </div>
                <div className="search-toolbar__actions">
                  <button
                    type="button"
                    className={`search-toolbar__filter-btn ${filtersOpen ? "search-toolbar__filter-btn--active" : ""}`}
                    onClick={() => setFiltersOpen((v) => !v)}
                    aria-expanded={filtersOpen}
                    aria-controls="org-filters-panel"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    Фильтры
                    {hasFilters && (
                      <span className="search-toolbar__filter-badge">
                        {[searchDebounced, minLaboratories && Number(minLaboratories) > 0, minEmployees && Number(minEmployees) > 0].filter(Boolean).length}
                      </span>
                    )}
                  </button>
                  <select
                    className="search-toolbar__sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Сортировка по дате"
                  >
                    <option value="date_desc">Сначала новые</option>
                    <option value="date_asc">Сначала старые</option>
                  </select>
                </div>
              </div>
              <div
                id="org-filters-panel"
                className={`filters-panel ${filtersOpen ? "filters-panel--open" : ""}`}
                role="region"
                aria-label="Фильтры"
              >
                <div className="vacancy-filters lab-filters">
                  <div className="vacancy-filters__field">
                    <label htmlFor="org-filter-min-labs" className="vacancy-filters__label">Минимум лабораторий</label>
                    <input
                      id="org-filter-min-labs"
                      type="number"
                      min="0"
                      className="vacancy-filters__select"
                      placeholder="Не менее"
                      value={minLaboratories}
                      onChange={(e) => setMinLaboratories(e.target.value)}
                    />
                  </div>
                  <div className="vacancy-filters__field">
                    <label htmlFor="org-filter-min-employees" className="vacancy-filters__label">Минимум сотрудников</label>
                    <input
                      id="org-filter-min-employees"
                      type="number"
                      min="0"
                      className="vacancy-filters__select"
                      placeholder="Не менее"
                      value={minEmployees}
                      onChange={(e) => setMinEmployees(e.target.value)}
                    />
                  </div>
                  {hasFilters && (
                    <button type="button" className="vacancy-filters__reset" onClick={resetFilters}>
                      Сбросить фильтры
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
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
              <button className="org-detail-back" onClick={goBack} type="button">
                ← Назад
              </button>
              <div className="org-detail-error-banner" role="alert">
                {error}
              </div>
            </div>
          </div>
        )}
        {!loading && !error && !selectedId && (
          <>
            <div className="org-cards-grid">
              {organizations.length === 0 ? (
                hasFilters ? (
                  <EmptySearchFallback
                    entityLabel="организации"
                    items={emptySuggestions}
                    loading={emptySuggestionsLoading}
                    onResetFilters={resetFilters}
                    renderCard={(org) => (
                      <OrganizationCard
                        key={org.id}
                        org={org}
                        onOpen={openOrganization}
                      />
                    )}
                  />
                ) : (
                  <div className="lab-empty-block org-empty-block">
                    <p className="lab-empty">
                      Публичные организации пока не добавлены.
                    </p>
                    <p className="lab-empty-hint">
                      Организации могут создавать профиль и публиковать его в разделе «Профиль».
                    </p>
                  </div>
                )
              ) : organizations.map((org) => (
                <OrganizationCard
                  key={org.id}
                  org={org}
                  onOpen={openOrganization}
                />
              ))}
            </div>
            {hasFilters && total > ORGANIZATIONS_PAGE_SIZE && (
              <div className="vacancy-pagination">
                <span className="vacancy-pagination__info">
                  Показано {(page - 1) * ORGANIZATIONS_PAGE_SIZE + 1}–{Math.min(page * ORGANIZATIONS_PAGE_SIZE, total)} из {total}
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
                    disabled={page * ORGANIZATIONS_PAGE_SIZE >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Вперёд
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {!loading && !error && selectedId && (
          <div className="org-details-page">
            {!detailsMap[selectedId] && <p className="muted">Загружаем профиль...</p>}
            {detailsMap[selectedId] && (
              <div className="org-details">
                <button className="org-detail-back" onClick={goBack} type="button">
                  ← Назад
                </button>
                <OrganizationDetailHero details={detailsMap[selectedId]} />
                <OrganizationSection
                  title="Лаборатории"
                  badge={detailsMap[selectedId].laboratories.length}
                  emptyMessage="Лаборатории не добавлены."
                  empty={detailsMap[selectedId].laboratories.length === 0}
                >
                  <div className="org-detail-grid">
                    {detailsMap[selectedId].laboratories.map((lab) => {
                      const labMedia = splitMedia(lab.image_urls);
                      return (
                        <OrganizationDetailCard
                          key={lab.id}
                          media={labMedia.images[0]}
                          onMediaClick={labMedia.images.length > 0 ? () => openGallery(labMedia.images, 0) : undefined}
                          mediaBadge={labMedia.images.length > 1 ? labMedia.images.length - 1 : 0}
                        >
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
                          {labMedia.docs.length > 0 && (
                            <div className="org-detail-card__files">
                              {labMedia.docs.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  {fileNameFromUrl(url)}
                                </a>
                              ))}
                            </div>
                          )}
                        </OrganizationDetailCard>
                      );
                    })}
                  </div>
                </OrganizationSection>
                <OrganizationSection
                  title="Оборудование"
                  badge={detailsMap[selectedId].equipment.length}
                  emptyMessage="Оборудование не добавлено."
                  empty={detailsMap[selectedId].equipment.length === 0}
                >
                  <div className="org-detail-grid">
                    {detailsMap[selectedId].equipment.map((item) => {
                      const itemMedia = splitMedia(item.image_urls);
                      return (
                        <OrganizationDetailCard
                          key={item.id}
                          media={itemMedia.images[0]}
                          onMediaClick={itemMedia.images.length > 0 ? () => openGallery(itemMedia.images, 0) : undefined}
                          mediaBadge={itemMedia.images.length > 1 ? itemMedia.images.length - 1 : 0}
                        >
                          <h3 className="org-detail-card__title">{item.name}</h3>
                          {item.characteristics && <p className="org-detail-card__text">{item.characteristics}</p>}
                          {item.description && <p className="org-detail-card__text">{item.description}</p>}
                          {itemMedia.docs.length > 0 && (
                            <div className="org-detail-card__files">
                              {itemMedia.docs.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  {fileNameFromUrl(url)}
                                </a>
                              ))}
                            </div>
                          )}
                        </OrganizationDetailCard>
                      );
                    })}
                  </div>
                </OrganizationSection>
                <OrganizationSection
                  title="Сотрудники"
                  badge={detailsMap[selectedId].employees.length}
                  emptyMessage="Сотрудники не добавлены."
                  empty={detailsMap[selectedId].employees.length === 0}
                >
                  <div className="org-detail-grid org-detail-grid--employees">
                    {detailsMap[selectedId].employees.map((employee) => {
                      const interests = Array.isArray(employee.research_interests) ? employee.research_interests : [];
                      return (
                        <OrganizationDetailCard
                          key={employee.id}
                          clickable
                          variant="employee"
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
                        </OrganizationDetailCard>
                      );
                    })}
                  </div>
                </OrganizationSection>
                <OrganizationSection
                  title="Решённые задачи"
                  badge={detailsMap[selectedId].task_solutions.length}
                  emptyMessage="Задачи не добавлены."
                  empty={detailsMap[selectedId].task_solutions.length === 0}
                >
                  <div className="org-detail-grid">
                    {detailsMap[selectedId].task_solutions.map((task) => (
                      <OrganizationDetailCard key={task.id}>
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
                      </OrganizationDetailCard>
                    ))}
                  </div>
                </OrganizationSection>
                <OrganizationSection
                  title="Запросы"
                  badge={detailsMap[selectedId].queries.length}
                  emptyMessage="Запросы не добавлены."
                  empty={detailsMap[selectedId].queries.length === 0}
                >
                  <div className="org-detail-grid">
                    {detailsMap[selectedId].queries.map((query) => (
                      <OrganizationDetailCard
                        key={query.id}
                        clickable={!!query.public_id}
                        variant="query"
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
                      </OrganizationDetailCard>
                    ))}
                  </div>
                </OrganizationSection>
                <OrganizationSection
                  title="Вакансии"
                  badge={detailsMap[selectedId].vacancies.length}
                  emptyMessage="Вакансии не добавлены."
                  empty={detailsMap[selectedId].vacancies.length === 0}
                >
                  <div className="org-detail-grid">
                    {detailsMap[selectedId].vacancies.map((vacancy) => (
                      <OrganizationDetailCard key={vacancy.id}>
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
                      </OrganizationDetailCard>
                    ))}
                  </div>
                </OrganizationSection>
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
