import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ToastContext";
import { useVacancySearch, useVacancyFilters } from "../hooks";
import { VacancyCard, VacancySearchBar, VacancyFilters, VacancyDetailHero } from "../components/vacancies";
import { OrganizationSection, OrganizationDetailCard } from "../components/organization";
import { Drawer, Button, Card, Badge } from "../components/ui";
import EmployeeModal from "./profile/EmployeeModal";
import { EmployeeCard } from "../components/EmployeeCard";
import EmptySearchFallback from "../components/EmptySearchFallback";
import { Mail, Phone, User, ListChecks, FileText, HelpCircle } from "lucide-react";
import { formatPhoneRU, normalizePhoneRU } from "../utils/validation";

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
          <div className="detail-page">
            <button className="org-detail-back" onClick={goBack} type="button">
              ← Назад
            </button>
            
            <VacancyDetailHero details={details} />

            <div className="detail-page__layout">
              <div className="detail-page__main">
                {detailSkills.length > 0 && (
                  <OrganizationSection title="Ключевые навыки" icon={<ListChecks size={20} />}>
                    <div className="org-detail-card__chips">
                      {detailSkills.map((skill, i) => (
                        <span key={i} className="org-detail-chip">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </OrganizationSection>
                )}

                {details.requirements && (
                  <OrganizationSection title="Требования" icon={<FileText size={20} />}>
                    <Card variant="glass" padding="md">
                      <p className="org-detail-card__text">{details.requirements}</p>
                    </Card>
                  </OrganizationSection>
                )}

                {details.description && (
                  <OrganizationSection title="Описание вакансии" icon={<FileText size={20} />}>
                    <Card variant="glass" padding="md">
                      <p className="org-detail-card__text">{details.description}</p>
                    </Card>
                  </OrganizationSection>
                )}

                {details.query && (
                  <OrganizationSection title="Связанный запрос" icon={<HelpCircle size={20} />}>
                    <OrganizationDetailCard variant="query" clickable onClick={() => openQuery(details.query.public_id)}>
                      <h3 className="org-detail-card__title">{details.query.title}</h3>
                      <span className="org-detail-card__cta">Открыть запрос →</span>
                    </OrganizationDetailCard>
                  </OrganizationSection>
                )}

                <div className="vacancy-response vacancy-response--prominent" style={{ marginTop: 0 }}>
                  {myResponse === null ? (
                    <p className="vacancy-response__loading">Загрузка…</p>
                  ) : !auth ? (
                    <div className="vacancy-response__cta-wrap">
                      <Button
                        variant="primary"
                        size="large"
                        to={`/login?returnUrl=${encodeURIComponent(`/vacancies/${selectedId}`)}`}
                        className="vacancy-response__btn"
                        style={{ width: '100%' }}
                      >
                        Войти, чтобы откликнуться
                      </Button>
                    </div>
                  ) : myResponse?.has_response ? (
                    <div className="vacancy-response__status-card">
                      <p className="vacancy-response__status">
                        Вы откликнулись на эту вакансию
                      </p>
                      <Badge variant={myResponse.status === 'accepted' ? 'success' : myResponse.status === 'rejected' ? 'rejected' : 'default'}>
                        {RESPONSE_STATUS_LABELS[myResponse.status] ?? myResponse.status}
                      </Badge>
                    </div>
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
                        style={{ width: '100%' }}
                      >
                        {respondLoading ? "Отправка…" : "Откликнуться на вакансию"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <aside className="detail-page__sidebar">
                {(details.contact_employee || details.contact_email || details.contact_phone) && (
                  <Card variant="elevated" padding="md" className="vacancy-sidebar-card">
                    <div className="detail-sidebar">
                      <h2 className="detail-sidebar__title">Контакты</h2>
                      {details.contact_employee && (
                        <div className="detail-sidebar__block">
                          <span className="detail-sidebar__label">
                            <User size={14} className="detail-sidebar__label-icon" />
                            Контактное лицо
                          </span>
                          <EmployeeCard
                            variant="list"
                            employee={details.contact_employee}
                            onClick={() => {
                              setEmployeePreview(details.contact_employee);
                              setShowEmployeePublications(false);
                            }}
                            listLabel=""
                          />
                        </div>
                      )}
                      {details.contact_email && (
                        <div className="detail-sidebar__block">
                          <span className="detail-sidebar__label">
                            <Mail size={14} className="detail-sidebar__label-icon" />
                            Email
                          </span>
                          <a
                            href={`mailto:${details.contact_email}`}
                            className="detail-sidebar__contact-link"
                          >
                            <Mail size={14} className="detail-sidebar__contact-icon" />
                            {details.contact_email}
                          </a>
                        </div>
                      )}
                      {details.contact_phone && (
                        <div className="detail-sidebar__block">
                          <span className="detail-sidebar__label">
                            <Phone size={14} className="detail-sidebar__label-icon" />
                            Телефон
                          </span>
                          <a
                            href={`tel:+7${normalizePhoneRU(details.contact_phone)}`}
                            className="detail-sidebar__contact-link"
                          >
                            <Phone size={14} className="detail-sidebar__contact-icon" />
                            {formatPhoneRU(details.contact_phone)}
                          </a>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </aside>
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
