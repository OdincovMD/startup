import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import EmptySearchFallback from "../components/EmptySearchFallback";

const SEARCH_DEBOUNCE_MS = 350;
const SUGGEST_DEBOUNCE_MS = 180;
const LABORATORIES_PAGE_SIZE = 20;

export default function Laboratories() {
  const [laboratories, setLaboratories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [withoutOrg, setWithoutOrg] = useState(false);
  const [minEmployees, setMinEmployees] = useState("");
  const [organizations, setOrganizations] = useState([]);
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
        const data = await apiRequest(`/laboratories/suggest?q=${encodeURIComponent(q)}&limit=10`);
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
        !e.target.closest("[data-lab-suggestions]")
      ) {
        hideSuggestions();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hideSuggestions]);

  useEffect(() => {
    async function loadOrganizations() {
      try {
        const data = await apiRequest("/labs/");
        setOrganizations(data?.items ?? (Array.isArray(data) ? data : []));
      } catch {
        // ignore
      }
    }
    loadOrganizations();
  }, []);

  const hasFilters = searchDebounced || organizationId || withoutOrg || (minEmployees !== "" && Number(minEmployees) > 0);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, organizationId, withoutOrg, minEmployees]);

  useEffect(() => {
    if (selectedId) hideSuggestions();
  }, [selectedId, hideSuggestions]);

  const resetFilters = () => {
    setSearchQuery("");
    setSearchDebounced("");
    setOrganizationId("");
    setWithoutOrg(false);
    setMinEmployees("");
    setPage(1);
    hideSuggestions();
  };

  useEffect(() => {
    if (!hasFilters || laboratories.length > 0 || loading) {
      setEmptySuggestions([]);
      setEmptySuggestionsLoading(false);
      return;
    }
    let cancelled = false;
    setEmptySuggestionsLoading(true);
    (async () => {
      try {
        const data = await apiRequest(
          `/home/empty-suggestions?type=laboratories&limit=12`
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
  }, [hasFilters, laboratories.length, loading]);

  useEffect(() => {
    async function loadLaboratories() {
      try {
        setLoading(true);
        if (!hasFilters) {
          const data = await apiRequest("/laboratories/");
          const items = data?.items ?? [];
          setLaboratories(items);
          setTotal(data?.total ?? items.length);
        } else {
          const params = new URLSearchParams();
          params.set("page", String(page));
          params.set("size", String(LABORATORIES_PAGE_SIZE));
          if (searchDebounced) params.set("q", searchDebounced);
          if (organizationId) params.set("organization_id", organizationId);
          if (withoutOrg) params.set("without_org", "true");
          const minEmp = minEmployees !== "" ? Number(minEmployees) : null;
          if (minEmp != null && minEmp > 0) params.set("min_employees", String(minEmp));
          if (sortBy && sortBy !== "date_desc") params.set("sort_by", sortBy);
          const data = await apiRequest(`/laboratories/?${params.toString()}`);
          const items = data?.items || [];
          setLaboratories(items);
          setTotal(data?.total ?? items.length);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadLaboratories();
  }, [hasFilters, searchDebounced, organizationId, withoutOrg, minEmployees, page, sortBy]);

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

  const goBack = () => {
    setError(null);
    navigate(-1);
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
          <>
            <div className="section-header section-header--search">
              <h2>Лаборатории</h2>
              <p>Научные лаборатории с описаниями, руководителями и командой. Выберите карточку, чтобы открыть детали и вакансии.</p>
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
                      placeholder="Название, описание, сотрудники, оборудование, организация…"
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
                      aria-label="Поиск по лабораториям"
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-expanded={suggestionsVisible}
                      aria-controls="lab-suggestions-list"
                      aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined}
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
                  {suggestionsVisible && (
                    <div
                      data-lab-suggestions
                      className="vacancy-search__suggestions vacancy-search__suggestions--dropdown"
                      role="listbox"
                      id="lab-suggestions-list"
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
                            id={`lab-suggestion-${i}`}
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
                    aria-controls="lab-filters-panel"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    Фильтры
                    {hasFilters && (
                      <span className="search-toolbar__filter-badge">
                        {[searchDebounced, organizationId, withoutOrg, minEmployees && Number(minEmployees) > 0].filter(Boolean).length}
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
                id="lab-filters-panel"
                className={`filters-panel ${filtersOpen ? "filters-panel--open" : ""}`}
                role="region"
                aria-label="Фильтры"
              >
                <div className="vacancy-filters lab-filters">
                  <div className="vacancy-filters__field">
                    <label htmlFor="lab-filter-org" className="vacancy-filters__label">Организация</label>
                    <select
                      id="lab-filter-org"
                      className="vacancy-filters__select"
                      value={organizationId}
                      onChange={(e) => setOrganizationId(e.target.value)}
                    >
                      <option value="">Все организации</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="vacancy-filters__field lab-filter-checkbox-wrap">
                    <span className="vacancy-filters__label">Независимые</span>
                    <label className="lab-filter-checkbox" htmlFor="lab-filter-without-org">
                      <input
                        id="lab-filter-without-org"
                        type="checkbox"
                        checked={withoutOrg}
                        onChange={(e) => setWithoutOrg(e.target.checked)}
                        aria-label="Только лаборатории без организации"
                      />
                      <span className="lab-filter-checkbox__box" aria-hidden="true" />
                      <span className="lab-filter-checkbox__label">Без организации</span>
                    </label>
                  </div>
                  <div className="vacancy-filters__field">
                    <label htmlFor="lab-filter-min-employees" className="vacancy-filters__label">Минимум сотрудников</label>
                    <input
                      id="lab-filter-min-employees"
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
          <>
            <div className="org-cards-grid">
              {laboratories.length === 0 ? (
                hasFilters ? (
                  <EmptySearchFallback
                    entityLabel="лаборатории"
                    items={emptySuggestions}
                    loading={emptySuggestionsLoading}
                    onResetFilters={resetFilters}
                    renderCard={(lab) => (
                      <LabCard
                        key={lab.id}
                        lab={lab}
                        labImages={labImages}
                        onOpen={openLaboratory}
                        onOrgClick={(id) => navigate(`/organizations/${id}`)}
                        navigate={navigate}
                      />
                    )}
                  />
                ) : (
                  <div className="lab-empty-block">
                    <p className="lab-empty">
                      Публичные лаборатории пока не добавлены.
                    </p>
                    <p className="lab-empty-hint">
                      Организации и представители лабораторий могут добавлять лаборатории в разделе «Профиль».
                    </p>
                  </div>
                )
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
            {hasFilters && total > LABORATORIES_PAGE_SIZE && (
              <div className="vacancy-pagination">
                <span className="vacancy-pagination__info">
                  Показано {(page - 1) * LABORATORIES_PAGE_SIZE + 1}–{Math.min(page * LABORATORIES_PAGE_SIZE, total)} из {total}
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
                    disabled={page * LABORATORIES_PAGE_SIZE >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Вперёд
                  </button>
                </div>
              </div>
            )}
          </>
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
                <button className="org-detail-back" onClick={goBack} type="button">
                  ← Назад
                </button>
                <div className="org-detail-error-banner" role="alert">
                  {error}
                </div>
              </div>
            )}
            {details && (
              <div className="org-details">
                <button className="org-detail-back" onClick={goBack} type="button">
                  ← Назад
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
