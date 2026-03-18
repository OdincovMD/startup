import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";

const SUGGEST_DEBOUNCE_MS = 180;
const TYPE_LABELS = {
  vacancy: "Вакансия",
  organization: "Организация",
  laboratory: "Лаборатория",
  query: "Запрос",
};
const TYPE_ROUTES = {
  vacancy: "vacancies",
  organization: "organizations",
  laboratory: "laboratories",
  query: "queries",
};

export default function GlobalSearch({ size }) {
  const navigate = useNavigate();
  const isLarge = size === "large";
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const hideDropdown = useCallback(() => {
    setVisible(false);
    setHighlightedIndex(-1);
  }, []);

  const selectItem = useCallback(
    (item) => {
      if (!item?.public_id || !item?.type) return;
      const route = TYPE_ROUTES[item.type];
      if (route) {
        navigate(`/${route}/${item.public_id}`);
      }
      setQuery("");
      hideDropdown();
    },
    [navigate, hideDropdown]
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      setVisible(false);
      return;
    }
    setVisible(true);
    setLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const data = await apiRequest(
          `/search/suggest?q=${encodeURIComponent(q)}&limit=12`
        );
        if (!cancelled) {
          setItems(data?.items || []);
          setHighlightedIndex(-1);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target) &&
        !e.target.closest("[data-global-search-suggestions]")
      ) {
        hideDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hideDropdown]);

  return (
    <div className={`global-search ${isLarge ? "global-search--large" : ""}`} ref={wrapRef}>
      <div className="global-search__field">
      <div
        className={`global-search__bar ${loading ? "global-search__bar--loading" : ""}`}
      >
        <span className="global-search__icon" aria-hidden="true">
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
          ref={inputRef}
          type="search"
          className="global-search__input"
          placeholder="Поиск вакансий, организаций, лабораторий, запросов…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightedIndex((i) =>
                i >= items.length - 1 ? items.length - 1 : i + 1
              );
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightedIndex((i) => (i <= 0 ? -1 : i - 1));
              return;
            }
            if (e.key === "Enter") {
              if (highlightedIndex >= 0 && items[highlightedIndex]) {
                e.preventDefault();
                selectItem(items[highlightedIndex]);
              } else {
                hideDropdown();
              }
              return;
            }
          }}
          aria-label="Глобальный поиск"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={visible && items.length > 0}
          aria-controls="global-search-suggestions-list"
          aria-activedescendant={
            highlightedIndex >= 0
              ? `global-suggestion-${highlightedIndex}`
              : undefined
          }
        />
        {query && (
          <button
            type="button"
            className="global-search__clear"
            onClick={() => setQuery("")}
            aria-label="Очистить поиск"
          >
            ×
          </button>
        )}
      </div>
      {visible && (
        <ul
          data-global-search-suggestions
          id="global-search-suggestions-list"
          className="global-search__suggestions global-search__suggestions--dropdown"
          role="listbox"
        >
            {loading ? (
              <li
                className="global-search__suggestion-item global-search__suggestion-item--loading"
                role="option"
              >
                Загрузка…
              </li>
            ) : items.length === 0 ? (
              <li
                className="global-search__suggestion-item global-search__suggestion-item--loading"
                role="option"
              >
                Нет результатов
              </li>
            ) : (
              items.map((item, i) => (
                <li
                  key={`${item.type}-${item.public_id}-${i}`}
                  id={`global-suggestion-${i}`}
                  role="option"
                  aria-selected={i === highlightedIndex}
                  className={`global-search__suggestion-item ${
                    i === highlightedIndex
                      ? "global-search__suggestion-item--highlighted"
                      : ""
                  }`}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onClick={() => selectItem(item)}
                >
                  <span
                    className={`global-search__type-badge global-search__type-badge--${item.type}`}
                  >
                    {TYPE_LABELS[item.type] || item.type}
                  </span>
                  <span className="global-search__suggestion-title">
                    {item.title}
                  </span>
                </li>
              ))
            )}
        </ul>
      )}
      </div>
    </div>
  );
}
