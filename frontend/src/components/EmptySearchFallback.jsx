import React from "react";

/**
 * Fallback block for empty search results.
 * Shows "Ничего похожего не нашлось" + suggestions grid when filters return 0 items.
 * Uses renderCard to render each suggestion (VacancyCard, QueryCard, LabCard, OrgCard).
 */
export default function EmptySearchFallback({
  entityLabel,
  items = [],
  loading = false,
  onResetFilters,
  renderCard,
}) {
  return (
    <div className="empty-search-fallback">
      <div className="empty-search-fallback__header">
        <p className="empty-search-fallback__title">
          Ничего похожего не нашлось
        </p>
        <p className="empty-search-fallback__subtitle">
          Посмотрите другие {entityLabel}:
        </p>
        {onResetFilters && (
          <button
            type="button"
            className="empty-search-fallback__reset"
            onClick={onResetFilters}
          >
            Сбросить фильтры
          </button>
        )}
      </div>
      <div className="empty-search-fallback__grid">
        {loading ? (
          Array.from({ length: 6 }, (_, i) => (
            <article key={i} className="org-card-modern empty-search-fallback__skeleton">
              <div className="org-card-modern__media">
                <div
                  className="skeleton"
                  aria-hidden="true"
                  style={{ width: "100%", aspectRatio: 1 }}
                />
              </div>
              <div className="org-card-modern__body">
                <div
                  className="skeleton"
                  aria-hidden="true"
                  style={{ height: "1.125rem", width: "80%" }}
                />
                <div
                  className="skeleton"
                  aria-hidden="true"
                  style={{ height: "0.875rem" }}
                />
              </div>
            </article>
          ))
        ) : (
          items.map((item, index) => (
            <React.Fragment key={item?.id ?? index}>
              {renderCard(item, index)}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}
