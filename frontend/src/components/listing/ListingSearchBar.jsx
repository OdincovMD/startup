import React from "react";
import { Button } from "../ui";

/**
 * Shared search bar component for listing pages (Vacancies, Laboratories, Organizations).
 * Supports placeholder, aria-label, suggestions listbox ID and data attribute for click-outside detection.
 */
export function ListingSearchBar({
  searchQuery,
  onSearchChange,
  loading,
  suggestions,
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
  onSearchClick = () => {},
  placeholder = "Поиск…",
  ariaLabel = "Поиск",
  suggestionsId = "listing-suggestions-list",
  dataSuggestionsAttr = "data-listing-suggestions",
  searchButtonText = "Найти",
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
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            aria-label={ariaLabel}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={suggestionsVisible}
            aria-controls={suggestionsId}
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
          <Button
            variant="primary"
            type="button"
            onClick={onSearchClick}
            className="listing-search-bar__btn"
          >
            {searchButtonText}
          </Button>
        </div>

        {suggestionsVisible && (
          <ul
            {...{ [dataSuggestionsAttr]: true }}
            id={suggestionsId}
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
              suggestions.map((text, i) => (
                <li
                  key={`${text}-${i}`}
                  id={`suggestion-${i}`}
                  role="option"
                  className={`listing-search-bar__suggestion-item ${
                    i === highlightedIndex ? "listing-search-bar__suggestion-item--highlighted" : ""
                  }`}
                  aria-selected={i === highlightedIndex}
                  onMouseEnter={() => onSuggestionMouseEnter(i)}
                  onClick={() => onSuggestionClick(text)}
                >
                  {text}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
