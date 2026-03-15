import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useApplicantSearch } from "../hooks";
import PageLoader from "../components/PageLoader";
import {
  ApplicantCard,
  ApplicantFilters,
  ApplicantSearchBar,
  ApplicantDetailHero,
} from "../components/applicants";
import OrganizationSection from "../components/organization/OrganizationSection";
import { Drawer, Button, Card } from "../components/ui";

const APPLICANTS_PAGE_SIZE = 20;
const JOB_SEARCH_LABELS = {
  active: "Активно ищу работу",
  passive: "Рассматриваю предложения",
  not_active: "Не ищу работу",
};

function fileNameFromUrl(url) {
  try {
    const withoutQuery = url.split("?")[0];
    const parts = withoutQuery.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "документ");
  } catch {
    return "документ";
  }
}

function ApplicantDetailView({ details, onBack }) {
  const [docsExpanded, setDocsExpanded] = useState(false);
  const [educationExpanded, setEducationExpanded] = useState(false);
  const [publicationsExpanded, setPublicationsExpanded] = useState(false);
  const documentUrls = details.document_urls || [];
  const hasDocs = documentUrls.length > 0;

  return (
    <div className="detail-page">
      <button type="button" className="org-detail-back" onClick={onBack}>
        ← Назад к списку
      </button>
      <ApplicantDetailHero details={details} />
      <div className="detail-page__layout">
        <div className="detail-page__main">
          {!details.resume_url && (
            <OrganizationSection title="Резюме" empty emptyMessage="Резюме не загружено" />
          )}

          {details.role === "student" && (
            <>
              {details.status && (
                <OrganizationSection title="Статус">
                  <Card variant="glass" padding="md">
                    <p className="org-detail-card__text">{details.status}</p>
                  </Card>
                </OrganizationSection>
              )}
              {details.summary && (
                <OrganizationSection title="О себе">
                  <Card variant="glass" padding="md">
                    <p className="org-detail-card__text" style={{ whiteSpace: "pre-wrap" }}>{details.summary}</p>
                  </Card>
                </OrganizationSection>
              )}
              {(details.education || []).length > 0 && (
                <div className="org-detail-section">
                  <div className={`profile-card-collapsible ${educationExpanded ? "expanded" : ""}`}>
                    <button
                      type="button"
                      className="profile-card-header"
                      onClick={() => setEducationExpanded((v) => !v)}
                      aria-expanded={educationExpanded}
                    >
                      Образование ({details.education.length})
                    </button>
                    <div className="profile-card-body">
                      <ul className="org-detail-list">
                        {details.education.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              {(details.skills || []).length > 0 && (
                <OrganizationSection title="Навыки">
                  <div className="org-detail-card__chips">
                    {details.skills.map((s, i) => (
                      <span key={i} className="org-detail-chip">{s}</span>
                    ))}
                  </div>
                </OrganizationSection>
              )}
              {(details.research_interests || []).length > 0 && (
                <OrganizationSection title="Научные интересы">
                  <div className="org-detail-card__chips">
                    {details.research_interests.map((s, i) => (
                      <span key={i} className="org-detail-chip">{s}</span>
                    ))}
                  </div>
                </OrganizationSection>
              )}
            </>
          )}

          {details.role === "researcher" && (
            <>
              {(details.academic_degree || details.position) && (
                <OrganizationSection title="Позиция">
                  <Card variant="glass" padding="md">
                    <p className="org-detail-card__text">
                      {[details.academic_degree, details.position].filter(Boolean).join(", ")}
                    </p>
                  </Card>
                </OrganizationSection>
              )}
              {(details.research_interests || []).length > 0 && (
                <OrganizationSection title="Научные интересы">
                  <div className="org-detail-card__chips">
                    {details.research_interests.map((s, i) => (
                      <span key={i} className="org-detail-chip">{s}</span>
                    ))}
                  </div>
                </OrganizationSection>
              )}
              {(details.education || []).length > 0 && (
                <div className="org-detail-section">
                  <div className={`profile-card-collapsible ${educationExpanded ? "expanded" : ""}`}>
                    <button
                      type="button"
                      className="profile-card-header"
                      onClick={() => setEducationExpanded((v) => !v)}
                      aria-expanded={educationExpanded}
                    >
                      Образование ({details.education.length})
                    </button>
                    <div className="profile-card-body">
                      <ul className="org-detail-list">
                        {details.education.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              {([details.hindex_wos, details.hindex_scopus, details.hindex_rsci, details.hindex_openalex].some(Boolean)) && (
                <OrganizationSection title="H-index">
                  <div className="org-detail-hindex">
                    {details.hindex_wos != null && (
                      <span className="org-detail-hindex__item">
                        <span className="org-detail-hindex__source">WOS</span>
                        <span className="org-detail-hindex__value">{details.hindex_wos}</span>
                      </span>
                    )}
                    {details.hindex_scopus != null && (
                      <span className="org-detail-hindex__item">
                        <span className="org-detail-hindex__source">Scopus</span>
                        <span className="org-detail-hindex__value">{details.hindex_scopus}</span>
                      </span>
                    )}
                    {details.hindex_rsci != null && (
                      <span className="org-detail-hindex__item">
                        <span className="org-detail-hindex__source">RSCI</span>
                        <span className="org-detail-hindex__value">{details.hindex_rsci}</span>
                      </span>
                    )}
                    {details.hindex_openalex != null && (
                      <span className="org-detail-hindex__item">
                        <span className="org-detail-hindex__source">OpenAlex</span>
                        <span className="org-detail-hindex__value">{details.hindex_openalex}</span>
                      </span>
                    )}
                  </div>
                </OrganizationSection>
              )}
              {(details.laboratories || []).length > 0 && (
                <OrganizationSection title="Лаборатории">
                  <ul className="org-detail-list">
                    {details.laboratories.map((lab, i) => (
                      <li key={i}>
                        {lab.public_id ? (
                          <Link to={`/laboratories/${lab.public_id}`} className="org-detail-card__file-link">
                            {lab.name}
                          </Link>
                        ) : (
                          lab.name
                        )}
                      </li>
                    ))}
                  </ul>
                </OrganizationSection>
              )}
              {(details.publications || []).length > 0 && (
                <div className="org-detail-section">
                  <div className={`profile-card-collapsible ${publicationsExpanded ? "expanded" : ""}`}>
                    <button
                      type="button"
                      className="profile-card-header"
                      onClick={() => setPublicationsExpanded((v) => !v)}
                      aria-expanded={publicationsExpanded}
                    >
                      Публикации ({details.publications.length})
                    </button>
                    <div className="profile-card-body">
                      <ul className="org-detail-list">
                        {details.publications.map((pub, i) => (
                          <li key={i}>
                            {pub.title}
                            {pub.link && (
                              <a href={pub.link} target="_blank" rel="noopener noreferrer" className="org-detail-card__file-link">
                                Ссылка
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              {(details.job_search_status ||
                details.desired_positions ||
                details.employment_type_preference ||
                details.preferred_region ||
                details.availability_date ||
                details.salary_expectation ||
                details.job_search_notes) && (
                <OrganizationSection title="Поиск работы">
                  <Card variant="glass" padding="md">
                    <div className="org-detail-jobsearch">
                      {details.job_search_status && (
                        <div className="org-detail-jobsearch__row">
                          <span className="org-detail-jobsearch__label">Статус</span>
                          <span className="org-detail-jobsearch__value org-detail-jobsearch__value--status">
                            {JOB_SEARCH_LABELS[details.job_search_status] || details.job_search_status}
                          </span>
                        </div>
                      )}
                      {details.desired_positions && (
                        <div className="org-detail-jobsearch__row">
                          <span className="org-detail-jobsearch__label">Желаемые позиции</span>
                          <span className="org-detail-jobsearch__value">{details.desired_positions}</span>
                        </div>
                      )}
                      {details.employment_type_preference && (
                        <div className="org-detail-jobsearch__row">
                          <span className="org-detail-jobsearch__label">Тип занятости</span>
                          <span className="org-detail-jobsearch__value">{details.employment_type_preference}</span>
                        </div>
                      )}
                      {details.preferred_region && (
                        <div className="org-detail-jobsearch__row">
                          <span className="org-detail-jobsearch__label">Регион</span>
                          <span className="org-detail-jobsearch__value">{details.preferred_region}</span>
                        </div>
                      )}
                      {details.availability_date && (
                        <div className="org-detail-jobsearch__row">
                          <span className="org-detail-jobsearch__label">Дата выхода</span>
                          <span className="org-detail-jobsearch__value">{details.availability_date}</span>
                        </div>
                      )}
                      {details.salary_expectation && (
                        <div className="org-detail-jobsearch__row">
                          <span className="org-detail-jobsearch__label">Ожидания по зарплате</span>
                          <span className="org-detail-jobsearch__value org-detail-jobsearch__value--salary">
                            {/^\d+$/.test(String(details.salary_expectation).trim())
                              ? `${Number(details.salary_expectation).toLocaleString("ru-RU")} ₽`
                              : details.salary_expectation}
                          </span>
                        </div>
                      )}
                      {details.job_search_notes && (
                        <div className="org-detail-jobsearch__row org-detail-jobsearch__row--notes">
                          <span className="org-detail-jobsearch__label">Примечания</span>
                          <span className="org-detail-jobsearch__value org-detail-jobsearch__value--notes" style={{ whiteSpace: "pre-wrap" }}>
                            {details.job_search_notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                </OrganizationSection>
              )}
            </>
          )}

          {hasDocs && (
            <div className="org-detail-section">
              <div className={`profile-card-collapsible ${docsExpanded ? "expanded" : ""}`}>
                <button
                  type="button"
                  className="profile-card-header"
                  onClick={() => setDocsExpanded((v) => !v)}
                  aria-expanded={docsExpanded}
                >
                  Дополнительные файлы ({documentUrls.length})
                </button>
                <div className="profile-card-body">
                  <ul className="org-detail-list">
                    {documentUrls.map((url, index) => (
                      <li key={index}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="org-detail-card__file-link"
                        >
                          {fileNameFromUrl(url) || `Документ ${index + 1}`}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getApplicantFilterCount(searchDebounced, roleFilter, statusFilter) {
  return [searchDebounced, roleFilter, statusFilter].filter(Boolean).length;
}

export default function Applicants() {
  const { auth, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { publicId } = useParams();
  const selectedId = useMemo(() => (publicId ? String(publicId) : null), [publicId]);

  const [applicants, setApplicants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  const roleKey = auth?.user?.role_name;
  const hasLabRole = roleKey === "lab_admin" || roleKey === "lab_representative";
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const canAccess = hasLabRole && subscription?.active === true;

  const search = useApplicantSearch(apiRequest, navigate, () => setSubscription({ active: false }));

  useEffect(() => {
    if (!auth) {
      navigate("/login", { replace: true });
      return;
    }
    if (auth?.token && auth?.user && !auth.user.role_name) {
      refreshUser();
      return;
    }
    if (auth && !hasLabRole) {
      navigate("/", { replace: true });
      return;
    }
  }, [auth, hasLabRole, navigate, refreshUser]);

  useEffect(() => {
    if (!hasLabRole || !auth?.token) {
      setSubscriptionLoading(false);
      setSubscription(null);
      return;
    }
    let cancelled = false;
    setSubscriptionLoading(true);
    apiRequest("/profile/subscription")
      .then((res) => {
        if (!cancelled) setSubscription(res || null);
      })
      .catch(() => {
        if (!cancelled) setSubscription(null);
      })
      .finally(() => {
        if (!cancelled) setSubscriptionLoading(false);
      });
    return () => { cancelled = true; };
  }, [hasLabRole, auth?.token]);

  const hasFilters = search.searchDebounced || roleFilter || statusFilter;

  useEffect(() => {
    setPage(1);
  }, [search.searchDebounced, roleFilter, statusFilter]);

  useEffect(() => {
    if (selectedId) search.hideSuggestions();
  }, [selectedId, search.hideSuggestions]);

  const handleResetFilters = useCallback(() => {
    search.setSearchQuery("");
    setRoleFilter("");
    setStatusFilter("");
    setPage(1);
    search.hideSuggestions();
    setFiltersDrawerOpen(false);
  }, [search]);

  useEffect(() => {
    if (!canAccess) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("size", String(APPLICANTS_PAGE_SIZE));
        if (search.searchDebounced) params.set("q", search.searchDebounced);
        if (roleFilter) params.set("role", roleFilter);
        if (statusFilter) params.set("status", statusFilter);
        if (sortBy && sortBy !== "date_desc") params.set("sort_by", sortBy);
        const data = await apiRequest(`/applicants/?${params.toString()}`);
        if (cancelled) return;
        setApplicants(data?.items ?? []);
        setTotal(data?.total ?? 0);
      } catch (e) {
        if (cancelled) return;
        if (e.status === 403 && e.subscriptionRequired) {
          setSubscription({ active: false });
          return;
        }
        if (e.status === 403) {
          refreshUser();
          navigate("/", { replace: true });
          return;
        }
        setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [canAccess, search.searchDebounced, roleFilter, statusFilter, sortBy, page, navigate, refreshUser]);

  useEffect(() => {
    if (!canAccess || !selectedId) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    async function loadDetails() {
      try {
        setLoadingDetails(true);
        setError(null);
        const data = await apiRequest(`/applicants/public/${selectedId}/details`);
        if (cancelled) return;
        setDetails(data);
      } catch (e) {
        if (cancelled) return;
        if (e.status === 403 && e.subscriptionRequired) {
          setSubscription({ active: false });
          setDetails(null);
          return;
        }
        if (e.status === 403) {
          refreshUser();
          navigate("/", { replace: true });
          return;
        }
        setError(e.message);
        setDetails(null);
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    }
    loadDetails();
    return () => { cancelled = true; };
  }, [canAccess, selectedId, navigate, refreshUser]);

  const openApplicant = useCallback(
    (id) => navigate(`/applicants/${id}`),
    [navigate]
  );
  const goBack = useCallback(() => {
    setError(null);
    navigate("/applicants");
  }, [navigate]);

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
    }
  };

  if (!auth) return <PageLoader />;
  if (auth && !hasLabRole) return <PageLoader />;
  if (hasLabRole && subscriptionLoading) return <PageLoader />;

  if (hasLabRole && !canAccess) {
    return (
      <main className="main">
        <section className="section">
          <div className="lab-empty-block org-empty-block applicant-subscription-gate">
            <p className="lab-empty">Доступ к разделу соискателей</p>
            <p className="lab-empty-hint">
              Раздел соискателей доступен только пользователям с активной подпиской. Оформите подписку, чтобы просматривать профили студентов и исследователей.
            </p>
            <Link to="/profile?section=subscription" className="primary-btn lab-empty-reset">
              Оформить подписку
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (selectedId) {
    if (loadingDetails) return <PageLoader />;
    if (error) {
      return (
        <main className="main">
          <section className="section">
            <div className="detail-page">
              <button className="org-detail-back" onClick={goBack} type="button">
                ← Назад
              </button>
              <div className="org-detail-error-banner" role="alert">
                {error}
              </div>
            </div>
          </section>
        </main>
      );
    }
    if (details) {
      return (
        <main className="main">
          <section className="section">
            <ApplicantDetailView details={details} onBack={goBack} />
          </section>
        </main>
      );
    }
    return <PageLoader />;
  }

  return (
    <main className="main">
      <section className="section" aria-label="Соискатели">
        <div className="listing-page">
          <h1 className="listing-page__title">Соискатели</h1>
          <div className="listing-page__grid">
            <aside className="listing-page__sidebar">
              <ApplicantFilters
                roleFilter={roleFilter}
                onRoleChange={setRoleFilter}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                hasFilters={hasFilters}
                onResetFilters={handleResetFilters}
              />
            </aside>
            <div className="listing-page__content">
              <div className="listing-page__toolbar">
                <ApplicantSearchBar
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
                  onFocus={() => search.searchQuery.trim().length >= 2 && search.setSuggestionsVisible(true)}
                  searchInputRef={search.searchInputRef}
                  searchWrapRef={search.searchWrapRef}
                  onClear={() => search.setSearchQuery("")}
                  suggestionApplied={search.suggestionApplied}
                />
                <select
                  className="listing-page__sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
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
                  {getApplicantFilterCount(search.searchDebounced, roleFilter, statusFilter) > 0 && (
                    <span className="listing-page__filters-badge">
                      {getApplicantFilterCount(search.searchDebounced, roleFilter, statusFilter)}
                    </span>
                  )}
                </button>
              </div>

              {loading && (
                <div className="listing-page__skeleton" aria-busy="true" role="status" aria-label="Загрузка">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="listing-card-skeleton applicant-card-skeleton">
                      <div className="skeleton listing-card-skeleton__avatar" />
                      <div className="listing-card-skeleton__body">
                        <div className="skeleton listing-card-skeleton__line listing-card-skeleton__line--title" />
                        <div className="skeleton listing-card-skeleton__line" />
                        <div className="skeleton listing-card-skeleton__line" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && !loading && <p className="listing-page__error error">{error}</p>}

              {!loading && !error && (
                <>
                  <div className="listing-page__list listing-page__list--grid">
                    {applicants.length === 0 ? (
                      <div className="listing-page__empty listing-page__empty--no-results">
                        <p className="listing-page__empty-text">
                          {hasFilters
                            ? "По вашему запросу ничего не найдено."
                            : "Нет опубликованных соискателей"}
                        </p>
                        <p className="listing-page__empty-hint">
                          {hasFilters
                            ? "Попробуйте изменить поисковый запрос или сбросить фильтры."
                            : "Студенты и исследователи могут включить публикацию профиля в разделе «Профиль»."}
                        </p>
                      </div>
                    ) : (
                      applicants.map((a) => (
                        <ApplicantCard key={a.public_id} applicant={a} onOpen={openApplicant} />
                      ))
                    )}
                  </div>

                  {total > APPLICANTS_PAGE_SIZE && (
                    <div className="listing-page__pagination">
                      <span className="listing-page__pagination-info">
                        Показано {(page - 1) * APPLICANTS_PAGE_SIZE + 1}–
                        {Math.min(page * APPLICANTS_PAGE_SIZE, total)} из {total}
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
                          disabled={page * APPLICANTS_PAGE_SIZE >= total}
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
        <ApplicantFilters
          roleFilter={roleFilter}
          onRoleChange={setRoleFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          hasFilters={hasFilters}
          onResetFilters={handleResetFilters}
        />
      </Drawer>
    </main>
  );
}
