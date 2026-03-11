import { useState, useEffect, useCallback, useRef } from "react";

const SEARCH_DEBOUNCE_MS = 350;
const SUGGEST_DEBOUNCE_MS = 180;

export function useVacancySearch(apiRequest) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [suggestionApplied, setSuggestionApplied] = useState(false);
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch suggestions
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
  }, [searchQuery, apiRequest]);

  const hideSuggestions = useCallback(() => {
    setSuggestionsVisible(false);
    setHighlightedIndex(-1);
  }, []);

  const applySuggestion = useCallback(
    (text) => {
      setSearchQuery(text);
      setSuggestionApplied(true);
      hideSuggestions();
      searchInputRef.current?.focus();
    },
    [hideSuggestions]
  );

  // Reset suggestion applied flag
  useEffect(() => {
    if (!suggestionApplied) return;
    const t = setTimeout(() => setSuggestionApplied(false), 450);
    return () => clearTimeout(t);
  }, [suggestionApplied]);

  // Close suggestions on outside click
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

  return {
    searchQuery,
    setSearchQuery,
    searchDebounced,
    suggestions,
    suggestionsLoading,
    suggestionsVisible,
    setSuggestionsVisible,
    highlightedIndex,
    setHighlightedIndex,
    suggestionApplied,
    hideSuggestions,
    applySuggestion,
    searchInputRef,
    searchWrapRef,
  };
}
