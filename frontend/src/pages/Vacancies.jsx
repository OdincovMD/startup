import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ToastContext";
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

const SEARCH_DEBOUNCE_MS = 350;
const SUGGEST_DEBOUNCE_MS = 180;
const VACANCIES_PAGE_SIZE = 20;

const EMPLOYMENT_TYPES = [
  { value: "", label: "Любой тип занятости" },
  { value: "Полная занятость", label: "Полная занятость" },
  { value: "Частичная занятость", label: "Частичная занятость" },
  { value: "Стажировка", label: "Стажировка" },
  { value: "Вахта", label: "Вахта" },
  { value: "Подработка", label: "Подработка" },
];

export default function Vacancies() {
  const { auth } = useAuth();
  const { showToast } = useToast();
  const [vacancies, setVacancies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [laboratoryId, setLaboratoryId] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [employeePreview, setEmployeePreview] = useState(null);
  const [showEmployeePublications, setShowEmployeePublications] = useState(false);
  const [myResponse, setMyResponse] = useState(null);
  const [respondLoading, setRespondLoading] = useState(false);
  const [respondError, setRespondError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState("date_desc");
  const [suggestionApplied, setSuggestionApplied] = useState(false);
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState(null);
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
        const data = await apiRequest(`/vacancies/suggest?q=${encodeURIComponent(q)}&limit=10`);
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

  const updateDropdownPosition = useCallback(() => {
    if (searchWrapRef.current) {
      const rect = searchWrapRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (suggestionsVisible) {
      updateDropdownPosition();
      const onScroll = () => {
        hideSuggestions();
      };
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", updateDropdownPosition);
      return () => {
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", updateDropdownPosition);
      };
    } else {
      setDropdownPosition(null);
    }
  }, [suggestionsVisible, updateDropdownPosition, hideSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target) &&
        !e.target.closest("[data-vacancy-suggestions]")
      ) {
        hideSuggestions();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hideSuggestions]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [orgs, labs] = await Promise.all([
          apiRequest("/labs/"),
          apiRequest("/laboratories/"),
        ]);
        setOrganizations(orgs || []);
        setLaboratories(labs || []);
      } catch {
        // ignore
      }
    }
    loadOptions();
  }, []);

  const hasFilters = searchDebounced || employmentType || organizationId || laboratoryId;

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, employmentType, organizationId, laboratoryId]);

  useEffect(() => {
    if (selectedId) hideSuggestions();
  }, [selectedId, hideSuggestions]);

  const resetFilters = () => {
    setSearchQuery("");
    setSearchDebounced("");
    setEmploymentType("");
    setOrganizationId("");
    setLaboratoryId("");
    setPage(1);
    hideSuggestions();
  };

  useEffect(() => {
    async function loadVacancies() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("size", String(VACANCIES_PAGE_SIZE));
        if (searchDebounced) params.set("q", searchDebounced);
        if (employmentType) params.set("employment_type", employmentType);
        if (organizationId) params.set("organization_id", organizationId);
        if (laboratoryId) params.set("laboratory_id", laboratoryId);
        if (sortBy && sortBy !== "date_desc") params.set("sort_by", sortBy);
        const data = await apiRequest(`/vacancies/?${params.toString()}`);
        const items = Array.isArray(data) ? data : (data?.items || []);
        setVacancies(items);
        setTotal(Array.isArray(data) ? items.length : (data?.total ?? items.length));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadVacancies();
  }, [searchDebounced, employmentType, organizationId, laboratoryId, page, sortBy]);

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
      showToast("Отклик отправлен");
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

  const goBack = () => {
    navigate(-1);
  };

  return (
    <main className="main">
      <section className="section">
        {!selectedId && (
          <>
            <div className="section-header section-header--search">
              <h2>Вакансии</h2>
              <p>Опубликованные вакансии платформы. Откройте карточку, чтобы увидеть описание и контакты.</p>
              <div className="search-toolbar">
                <div className="vacancy-search" ref={searchWrapRef}>
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
                      placeholder="Название, навыки, лаборатория…"
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
                      aria-label="Поиск по вакансиям"
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-expanded={suggestionsVisible && suggestions.length > 0}
                      aria-controls="vacancy-suggestions-list"
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
                </div>
                <div className="search-toolbar__actions">
                  <button
                    type="button"
                    className={`search-toolbar__filter-btn ${filtersOpen ? "search-toolbar__filter-btn--active" : ""}`}
                  onClick={() => setFiltersOpen((v) => !v)}
                  aria-expanded={filtersOpen}
                  aria-controls="vacancy-filters-panel"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  Фильтры
                  {hasFilters && <span className="search-toolbar__filter-badge">{[employmentType, organizationId, laboratoryId].filter(Boolean).length}</span>}
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
                id="vacancy-filters-panel"
                className={`filters-panel ${filtersOpen ? "filters-panel--open" : ""}`}
                role="region"
                aria-label="Фильтры"
              >
                <div className="vacancy-filters">
                  <div className="vacancy-filters__field">
                    <label htmlFor="vacancy-filter-employment" className="vacancy-filters__label">Тип занятости</label>
                    <select
                      id="vacancy-filter-employment"
                      className="vacancy-filters__select"
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                    >
                      {EMPLOYMENT_TYPES.map((opt) => (
                        <option key={opt.value || "_"} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="vacancy-filters__field">
                    <label htmlFor="vacancy-filter-org" className="vacancy-filters__label">Организация</label>
                    <select
                      id="vacancy-filter-org"
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
                  <div className="vacancy-filters__field">
                    <label htmlFor="vacancy-filter-lab" className="vacancy-filters__label">Лаборатория</label>
                    <select
                      id="vacancy-filter-lab"
                      className="vacancy-filters__select"
                      value={laboratoryId}
                      onChange={(e) => setLaboratoryId(e.target.value)}
                    >
                      <option value="">Все лаборатории</option>
                      {laboratories.map((lab) => (
                        <option key={lab.id} value={lab.id}>{lab.name}</option>
                      ))}
                    </select>
                  </div>
                  {hasFilters && (
                    <button type="button" className="vacancy-filters__reset" onClick={resetFilters}>
                      Сбросить фильтры
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="vacancy-main">
                {loading && (
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
                {!loading && !error && (
                  <>
                    <div className="org-cards-grid">
                      {vacancies.length === 0 ? (
                        <div className="lab-empty-block org-empty-block vacancy-empty">
                          <p className="lab-empty">
                            {hasFilters
                              ? "По вашему запросу ничего не найдено."
                              : "Опубликованные вакансии пока не добавлены."}
                          </p>
                          <p className="lab-empty-hint">
                            {hasFilters
                              ? "Попробуйте изменить поисковый запрос или сбросить фильтры."
                              : "Организации публикуют вакансии в разделе «Профиль»."}
                          </p>
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
                    {total > VACANCIES_PAGE_SIZE && (
                      <div className="vacancy-pagination">
                        <span className="vacancy-pagination__info">
                          Показано {(page - 1) * VACANCIES_PAGE_SIZE + 1}–{Math.min(page * VACANCIES_PAGE_SIZE, total)} из {total}
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
                            disabled={page * VACANCIES_PAGE_SIZE >= total}
                            onClick={() => setPage((p) => p + 1)}
                          >
                            Вперёд
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
            </div>
          </>
        )}

        {selectedId && (
          <div className="org-details-page">
            {!details && loadingDetails && <p className="muted">Загружаем вакансию...</p>}
            {!details && !loadingDetails && error && <p className="error">{error}</p>}
            {details && (
              <div className="org-details">
                <button className="org-detail-back" onClick={goBack} type="button">
                  ← Назад
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

      {typeof document !== "undefined" &&
        document.body &&
        suggestionsVisible &&
        (suggestions.length > 0 || suggestionsLoading) &&
        dropdownPosition &&
        createPortal(
          <ul
            data-vacancy-suggestions
            id="vacancy-suggestions-list"
            className="vacancy-search__suggestions vacancy-search__suggestions--portal"
            role="listbox"
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            {suggestionsLoading && suggestions.length === 0 ? (
              <li className="vacancy-search__suggestion-item vacancy-search__suggestion-item--loading" role="option">
                Загрузка…
              </li>
            ) : (
              suggestions.map((text, i) => (
                <li
                  key={`${text}-${i}`}
                  id={`suggestion-${i}`}
                  role="option"
                  className={`vacancy-search__suggestion-item ${i === highlightedIndex ? "vacancy-search__suggestion-item--highlighted" : ""}`}
                  aria-selected={i === highlightedIndex}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onClick={() => applySuggestion(text)}
                >
                  {text}
                </li>
              ))
            )}
          </ul>,
          document.body
        )}
    </main>
  );
}
