import React from "react";

/**
 * Search bar for applicants page. Uses listing-search-bar styles.
 * Suggestions are objects {text, full_name, public_id}; onSuggestionClick receives the full item.
 */
export function ApplicantSearchBar({
  searchQuery,
  onSearchChange,
  loading,
  suggestions = [],
  suggestionsLoading,
  suggestionsVisible,
  highlightedIndex,
  onSuggestionMouseEnter,
  onSuggestionClick,
  onKeyDown,
  onFocus,
  searchInputRef,
  searchWrapRef,
  onClear,
  suggestionApplied,
}) {
  return (
    <div className="listing-search-bar" ref={searchWrapRef}>
      <div className="listing-search-bar__field">
        <div
          className={`listing-search-bar__wrap ${loading ? "listing-search-bar__wrap--loading" : ""} ${
            suggestionApplied ? "listing-search-bar__wrap--applied" : ""
          }`}
        >
          <span className="listing-search-bar__icon" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            ref={searchInputRef}
            type="search"
            className="ui-input listing-search-bar__input"
            placeholder="Имя, навыки, интересы…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            aria-label="Поиск по соискателям"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={suggestionsVisible}
            aria-controls="applicant-suggestions-list"
            aria-activedescendant={
              highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined
            }
          />
          {searchQuery && (
            <button
              type="button"
              className="listing-search-bar__clear"
              onClick={onClear}
              aria-label="Очистить поиск"
            >
              ×
            </button>
          )}
        </div>

        {suggestionsVisible && (
          <ul
            data-applicant-suggestions
            id="applicant-suggestions-list"
            className="listing-search-bar__suggestions"
            role="listbox"
          >
            {suggestionsLoading ? (
              <li
                className="listing-search-bar__suggestion-item listing-search-bar__suggestion-item--loading"
                role="option"
              >
                Загрузка…
              </li>
            ) : suggestions.length === 0 ? (
              <li
                className="listing-search-bar__suggestion-item listing-search-bar__suggestion-item--loading"
                role="option"
              >
                Нет подсказок
              </li>
            ) : (
              suggestions.map((item, i) => (
                <li
                  key={`${item.public_id || item.text || i}-${i}`}
                  id={`suggestion-${i}`}
                  role="option"
                  className={`listing-search-bar__suggestion-item ${
                    i === highlightedIndex ? "listing-search-bar__suggestion-item--highlighted" : ""
                  }`}
                  aria-selected={i === highlightedIndex}
                  onMouseEnter={() => onSuggestionMouseEnter(i)}
                  onClick={() => onSuggestionClick(item)}
                >
                  {item.text || item.full_name}
                  {item.public_id && item.full_name && item.text !== item.full_name && (
                    <span className="listing-search-bar__suggestion-meta">
                      {" "}
                      — {item.full_name}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
