import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ToastContext";
import { useVacancySearch, useVacancyFilters } from "../hooks";
import { VacancyCard, VacancySearchBar, VacancyFilters } from "../components/vacancies";
import { Drawer, Button, Card } from "../components/ui";
import EmployeeModal from "./profile/EmployeeModal";
import EmptySearchFallback from "../components/EmptySearchFallback";

const RESPONSE_STATUS_LABELS = { new: "Новый", accepted: "Принят", rejected: "Отклонен" };
const VACANCIES_PAGE_SIZE = 20;

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
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { publicId } = useParams();
  const selectedId = useMemo(() => (publicId ? String(publicId) : null), [publicId]);

  // Search hook
  const search = useVacancySearch(apiRequest);

  // Filters hook
  const filters = useVacancyFilters();

  // State
  const [vacancies, setVacancies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [employeePreview, setEmployeePreview] = useState(null);
  const [showEmployeePublications, setShowEmployeePublications] = useState(false);
  const [myResponse, setMyResponse] = useState(null);
  const [respondLoading, setRespondLoading] = useState(false);
  const [respondError, setRespondError] = useState(null);
  const [emptySuggestions, setEmptySuggestions] = useState([]);
  const [emptySuggestionsLoading, setEmptySuggestionsLoading] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  const hasFilters = search.searchDebounced || filters.hasFilters;

  const handleResetFilters = useCallback(() => {
    filters.resetFilters();
    search.setSearchQuery("");
    search.hideSuggestions();
    setPage(1);
    setFiltersDrawerOpen(false);
  }, [filters, search]);

  // Load organizations and laboratories
  useEffect(() => {
    async function loadOptions() {
      try {
        const [orgs, labs] = await Promise.all([
          apiRequest("/labs/"),
          apiRequest("/laboratories/"),
        ]);
        setOrganizations(orgs?.items ?? (Array.isArray(orgs) ? orgs : []));
        setLaboratories(labs?.items ?? (Array.isArray(labs) ? labs : []));
      } catch {
        // ignore
      }
    }
    loadOptions();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search.searchDebounced, filters.employmentType, filters.organizationId, filters.laboratoryId]);

  // Load vacancies
  useEffect(() => {
    async function loadVacancies() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("size", String(VACANCIES_PAGE_SIZE));
        if (search.searchDebounced) params.set("q", search.searchDebounced);
        if (filters.employmentType) params.set("employment_type", filters.employmentType);
        if (filters.organizationId) params.set("organization_id", filters.organizationId);
        if (filters.laboratoryId) params.set("laboratory_id", filters.laboratoryId);
        if (filters.sortBy && filters.sortBy !== "date_desc") params.set("sort_by", filters.sortBy);
        
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
  }, [search.searchDebounced, filters.employmentType, filters.organizationId, filters.laboratoryId, page, filters.sortBy]);

  // Load vacancy details
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

  // Load user's response to this vacancy
  useEffect(() => {
    if (!selectedId) {
      setMyResponse(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest(`/vacancies/public/${selectedId}/my-response`).catch(() => ({
          has_response: false,
        }));
        if (!cancelled) setMyResponse(data || { has_response: false });
      } catch {
        if (!cancelled) setMyResponse({ has_response: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, auth?.token]);

  // Load empty suggestions when no results
  useEffect(() => {
    if (!hasFilters || vacancies.length > 0 || loading) {
      setEmptySuggestions([]);
      setEmptySuggestionsLoading(false);
      return;
    }
    let cancelled = false;
    setEmptySuggestionsLoading(true);
    (async () => {
      try {
        const data = await apiRequest(`/home/empty-suggestions?type=vacancies&limit=15`);
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
  }, [hasFilters, vacancies.length, loading]);

  // Hide suggestions when detail view is opened
  useEffect(() => {
    if (selectedId) {
      search.hideSuggestions();
    }
  }, [selectedId, search]);

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

  const handleSearchKeyDown = (e) => {
    if (!search.suggestionsVisible || search.suggestions.length === 0) return;
    if (e.key === "Escape") {
      e.preventDefault();
      search.hideSuggestions();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      search.setHighlightedIndex((i) => (i < search.suggestions.length - 1 ? i + 1 : -1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      search.setHighlightedIndex((i) => (i <= 0 ? -1 : i - 1));
      return;
    }
    if (e.key === "Enter") {
      if (search.highlightedIndex >= 0 && search.suggestions[search.highlightedIndex]) {
        e.preventDefault();
        search.applySuggestion(search.suggestions[search.highlightedIndex]);
      } else {
        search.hideSuggestions();
      }
      return;
    }
  };

  if (selectedId && details) {
    return (
      <main className="main">
        <section className="section">
          <div className="org-details-page">
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

                  <div className="vacancy-response vacancy-response--prominent">
                    {myResponse === null ? (
                      <p className="vacancy-response__loading">Загрузка…</p>
                    ) : !auth ? (
                      <div className="vacancy-response__cta-wrap">
                        <Button
                          variant="primary"
                          size="large"
                          to={`/login?returnUrl=${encodeURIComponent(`/vacancies/${selectedId}`)}`}
                          className="vacancy-response__btn"
                        >
                          Войти, чтобы откликнуться
                        </Button>
                      </div>
                    ) : myResponse?.has_response ? (
                      <p className="vacancy-response__status">
                        Вы откликнулись. Статус:{" "}
                        <span className="vacancy-response__chip">
                          {RESPONSE_STATUS_LABELS[myResponse.status] ?? myResponse.status}
                        </span>
                      </p>
                    ) : (
                      <div className="vacancy-response__cta-wrap">
                        {respondError && (
                          <p className="auth-alert auth-alert-error" role="alert">
                            {respondError}
                          </p>
                        )}
                        <Button
                          variant="primary"
                          size="large"
                          onClick={handleRespond}
                          disabled={respondLoading}
                          className="vacancy-response__btn"
                        >
                          {respondLoading ? "Отправка…" : "Откликнуться"}
                        </Button>
                      </div>
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
                      <div className="vacancy-detail-skills" aria-label="Навыки и ключевые требования по вакансии">
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
                      <p className="vacancy-detail__text vacancy-detail__text--muted">{details.description}</p>
                    </div>
                  )}

                  {(details.contact_employee || details.contact_email || details.contact_phone) && (
                    <Card variant="elevated" padding="md" className="vacancy-contacts-card">
                      <h2 className="vacancy-contacts-card__title">Контакты</h2>
                      <div className="vacancy-contacts-card__content">
                        {details.contact_employee && (
                          <button
                            type="button"
                            className="vacancy-contact"
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
                        )}
                        {(details.contact_email || details.contact_phone) && (
                          <div className="vacancy-contacts-card__data">
                            {details.contact_email && (
                              <div className="vacancy-contacts-card__row">
                                <span className="vacancy-contacts-card__label">Email</span>
                                <a href={`mailto:${details.contact_email}`} className="vacancy-contacts-card__link">
                                  {details.contact_email}
                                </a>
                              </div>
                            )}
                            {details.contact_phone && (
                              <div className="vacancy-contacts-card__row">
                                <span className="vacancy-contacts-card__label">Телефон</span>
                                <span>{details.contact_phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
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

  return (
    <main className="main">
      <section className="section">
        <div className="listing-page">
          <h1 className="listing-page__title">Вакансии</h1>
          <div className="listing-page__grid">
        <aside className="listing-page__sidebar">
          <VacancyFilters
            employmentType={filters.employmentType}
            onEmploymentTypeChange={filters.setEmploymentType}
            organizationId={filters.organizationId}
            onOrganizationChange={filters.setOrganizationId}
            laboratoryId={filters.laboratoryId}
            onLaboratoryChange={filters.setLaboratoryId}
            organizations={organizations}
            laboratories={laboratories}
            hasFilters={filters.hasFilters}
            onResetFilters={handleResetFilters}
          />
        </aside>
        <div className="listing-page__content">
          <div className="listing-page__toolbar">
            <VacancySearchBar
              searchQuery={search.searchQuery}
              onSearchChange={search.setSearchQuery}
              loading={loading}
              suggestions={search.suggestions}
              suggestionsLoading={search.suggestionsLoading}
              suggestionsVisible={search.suggestionsVisible}
              highlightedIndex={search.highlightedIndex}
              onSuggestionMouseEnter={search.setHighlightedIndex}
              onSuggestionClick={search.applySuggestion}
              onKeyDown={handleSearchKeyDown}
              onFocus={() =>
                search.searchQuery.trim().length >= 2 && search.setSuggestionsVisible(true)
              }
              searchInputRef={search.searchInputRef}
              searchWrapRef={search.searchWrapRef}
              onClear={() => search.setSearchQuery("")}
              suggestionApplied={search.suggestionApplied}
            />
            <select
              className="listing-page__sort"
              value={filters.sortBy}
              onChange={(e) => filters.setSortBy(e.target.value)}
              aria-label="Сортировка по дате"
            >
              <option value="date_desc">Сначала новые</option>
              <option value="date_asc">Сначала старые</option>
            </select>
            <button
              type="button"
              className="listing-page__filters-toggle"
              onClick={() => setFiltersDrawerOpen(true)}
              aria-label="Открыть фильтры"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Фильтры
              {filters.getActiveFilterCount() > 0 && (
                <span className="listing-page__filters-badge">{filters.getActiveFilterCount()}</span>
              )}
            </button>
          </div>

          {loading && (
            <div className="listing-page__skeleton" aria-busy="true" role="status" aria-label="Загрузка">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="listing-card-skeleton">
                  <div className="skeleton" style={{ height: "1.25rem", width: "70%" }} />
                  <div className="skeleton" style={{ height: "0.875rem", width: "50%", marginTop: "0.5rem" }} />
                  <div className="skeleton" style={{ height: "0.875rem", width: "100%", marginTop: "0.75rem" }} />
                  <div className="skeleton" style={{ height: "0.875rem", width: "90%", marginTop: "0.25rem" }} />
                </div>
              ))}
            </div>
          )}

          {error && <p className="listing-page__error error">{error}</p>}

          {!loading && !error && (
            <>
              <div className="listing-page__list listing-page__list--grid">
                {vacancies.length === 0 ? (
                  hasFilters ? (
                    <div className="listing-page__empty">
                      <EmptySearchFallback
                        entityLabel="вакансии"
                        items={emptySuggestions}
                        loading={emptySuggestionsLoading}
                        onResetFilters={handleResetFilters}
                        renderCard={(vacancy) => (
                          <VacancyCard
                            key={vacancy.id}
                            vacancy={vacancy}
                            onClick={() => vacancy.public_id && openVacancy(vacancy.public_id)}
                            onKeyDown={(e) => {
                              if (vacancy.public_id && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                openVacancy(vacancy.public_id);
                              }
                            }}
                          />
                        )}
                      />
                    </div>
                  ) : (
                    <div className="listing-page__empty listing-page__empty--no-results">
                      <p className="listing-page__empty-text">Опубликованные вакансии пока не добавлены.</p>
                      <p className="listing-page__empty-hint">Организации публикуют вакансии в разделе «Профиль».</p>
                    </div>
                  )
                ) : (
                  vacancies.map((vacancy) => (
                    <VacancyCard
                      key={vacancy.id}
                      vacancy={vacancy}
                      onClick={() => vacancy.public_id && openVacancy(vacancy.public_id)}
                      onKeyDown={(e) => {
                        if (vacancy.public_id && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          openVacancy(vacancy.public_id);
                        }
                      }}
                    />
                  ))
                )}
              </div>

              {total > VACANCIES_PAGE_SIZE && (
                <div className="listing-page__pagination">
                  <span className="listing-page__pagination-info">
                    Показано {(page - 1) * VACANCIES_PAGE_SIZE + 1}–
                    {Math.min(page * VACANCIES_PAGE_SIZE, total)} из {total}
                  </span>
                  <div className="listing-page__pagination-buttons">
                    <Button
                      variant="ghost"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Назад
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={page * VACANCIES_PAGE_SIZE >= total}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Вперёд
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
        </div>
      </section>

      <Drawer
        isOpen={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        title="Фильтры"
      >
        <VacancyFilters
          employmentType={filters.employmentType}
          onEmploymentTypeChange={filters.setEmploymentType}
          organizationId={filters.organizationId}
          onOrganizationChange={filters.setOrganizationId}
          laboratoryId={filters.laboratoryId}
          onLaboratoryChange={filters.setLaboratoryId}
          organizations={organizations}
          laboratories={laboratories}
          hasFilters={filters.hasFilters}
          onResetFilters={handleResetFilters}
        />
      </Drawer>

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
