import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import EmployeeModal from "./profile/EmployeeModal";

const QUERY_STATUS_LABELS = { active: "Активный", paused: "На паузе", closed: "Закрыт" };
const QUERY_STATUS_OPTIONS = [
  { value: "", label: "Любой" },
  { value: "active", label: "Активный" },
  { value: "paused", label: "На паузе" },
  { value: "closed", label: "Закрыт" },
];
const SEARCH_DEBOUNCE_MS = 350;
const SUGGEST_DEBOUNCE_MS = 180;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [laboratoryId, setLaboratoryId] = useState("");
  const [budgetContains, setBudgetContains] = useState("");
  const [budgetDebounced, setBudgetDebounced] = useState("");
  const [laboratories, setLaboratories] = useState([]);
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
    const t = setTimeout(() => setBudgetDebounced(budgetContains.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [budgetContains]);

  useEffect(() => {
    async function loadLaboratories() {
      try {
        const data = await apiRequest("/laboratories/");
        setLaboratories(Array.isArray(data) ? data : []);
      } catch {
        setLaboratories([]);
      }
    }
    loadLaboratories();
  }, []);

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
        const data = await apiRequest(`/queries/suggest?q=${encodeURIComponent(q)}&limit=10`);
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
        !e.target.closest("[data-query-suggestions]")
      ) {
        hideSuggestions();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hideSuggestions]);

  useEffect(() => {
    if (selectedId) hideSuggestions();
  }, [selectedId, hideSuggestions]);

  const hasFilters = Boolean(
    searchDebounced || status || laboratoryId || budgetDebounced
  );

  useEffect(() => {
    async function loadQueries() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchDebounced) params.set("q", searchDebounced);
        if (status) params.set("status", status);
        if (laboratoryId) params.set("laboratory_id", laboratoryId);
        if (budgetDebounced) params.set("budget_contains", budgetDebounced);
        if (sortBy && sortBy !== "date_desc") params.set("sort_by", sortBy);
        const url = params.toString() ? `/queries/?${params.toString()}` : "/queries/";
        const data = await apiRequest(url);
        setQueries(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadQueries();
  }, [searchDebounced, status, laboratoryId, budgetDebounced, sortBy]);

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

  const resetFilters = () => {
    setSearchQuery("");
    setSearchDebounced("");
    setStatus("");
    setLaboratoryId("");
    setBudgetContains("");
    hideSuggestions();
  };

  return (
    <main className="main">
      <section className="section">
        {!selectedId && (
          <>
            <div className="section-header section-header--search">
              <h2>Запросы</h2>
              <p>Заявки на R&D с описанием, бюджетом и грантами. Откройте карточку для деталей и связанных лабораторий.</p>
              <div className="search-toolbar">
                <div className="query-search" ref={searchWrapRef}>
                  <div className={`query-search__bar ${loading ? "query-search__bar--loading" : ""} ${suggestionApplied ? "query-search__bar--applied" : ""}`}>
                    <span className="query-search__icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                    </span>
                    <input
                      ref={searchInputRef}
                      type="search"
                      className="query-search__input"
                      placeholder="Название, описание, организация…"
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
                      aria-label="Поиск по запросам"
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-expanded={suggestionsVisible && suggestions.length > 0}
                      aria-controls="query-suggestions-list"
                      aria-activedescendant={highlightedIndex >= 0 ? `query-suggestion-${highlightedIndex}` : undefined}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="query-search__clear"
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
                  aria-controls="query-filters-panel"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  Фильтры
                  {hasFilters && <span className="search-toolbar__filter-badge">{[status, laboratoryId, budgetDebounced].filter(Boolean).length}</span>}
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
                id="query-filters-panel"
                className={`filters-panel ${filtersOpen ? "filters-panel--open" : ""}`}
                role="region"
                aria-label="Фильтры"
              >
                <div className="query-filters">
                  <div className="query-filters__field">
                    <label htmlFor="query-filter-status" className="query-filters__label">Статус</label>
                    <select
                      id="query-filter-status"
                      className="query-filters__select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {QUERY_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value || "_"} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="query-filters__field">
                    <label htmlFor="query-filter-lab" className="query-filters__label">Лаборатория</label>
                    <select
                      id="query-filter-lab"
                      className="query-filters__select"
                      value={laboratoryId}
                      onChange={(e) => setLaboratoryId(e.target.value)}
                    >
                      <option value="">Все лаборатории</option>
                      {laboratories.map((lab) => (
                        <option key={lab.id} value={lab.id}>{lab.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="query-filters__field">
                    <label htmlFor="query-filter-budget" className="query-filters__label">Бюджет содержит</label>
                    <input
                      id="query-filter-budget"
                      type="text"
                      className="query-filters__input"
                      placeholder="Например: млн, 500"
                      value={budgetContains}
                      onChange={(e) => setBudgetContains(e.target.value)}
                    />
                  </div>
                  {hasFilters && (
                    <button type="button" className="query-filters__reset" onClick={resetFilters}>
                      Сбросить фильтры
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        {!selectedId && (
          <div className="query-main">
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
                <div className="org-cards-grid">
            {queries.length === 0 ? (
              <div className="lab-empty-block org-empty-block query-empty">
                <p className="lab-empty">
                  {hasFilters
                    ? "По вашему запросу ничего не найдено."
                    : "Публичные запросы пока не добавлены."}
                </p>
                <p className="lab-empty-hint">
                  {hasFilters
                    ? "Попробуйте изменить поисковый запрос или сбросить фильтры."
                    : "Организации добавляют запросы в разделе «Профиль»."}
                </p>
                {hasFilters && (
                  <button type="button" className="primary-btn lab-empty-reset" onClick={resetFilters}>
                    Сбросить фильтры
                  </button>
                )}
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

      {typeof document !== "undefined" &&
        document.body &&
        suggestionsVisible &&
        (suggestions.length > 0 || suggestionsLoading) &&
        dropdownPosition &&
        createPortal(
          <ul
            data-query-suggestions
            id="query-suggestions-list"
            className="query-search__suggestions query-search__suggestions--portal"
            role="listbox"
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            {suggestionsLoading && suggestions.length === 0 ? (
              <li className="query-search__suggestion-item query-search__suggestion-item--loading" role="option">
                Загрузка…
              </li>
            ) : (
              suggestions.map((text, i) => (
                <li
                  key={`${text}-${i}`}
                  id={`query-suggestion-${i}`}
                  role="option"
                  className={`query-search__suggestion-item ${i === highlightedIndex ? "query-search__suggestion-item--highlighted" : ""}`}
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
