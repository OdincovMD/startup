import React, { useState } from "react";
import { apiRequest } from "../../api/client";
import { useToast } from "../../ToastContext";

const OpenAlexIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <circle cx="8" cy="16" r="2.2"/>
    <circle cx="12" cy="8" r="2.2"/>
    <circle cx="16" cy="16" r="2.2"/>
  </svg>
);

export default function OpenAlexProfileSection({ profile, onOpenAlexLinked, compact }) {
  const { showToast } = useToast();
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const hasOpenAlex = Boolean(profile?.openalex_id);

  const extractOpenAlexId = (val) => {
    if (!val?.trim()) return "";
    const v = val.trim();
    if (v.includes("openalex.org/")) {
      return v.split("/").pop() || "";
    }
    return v;
  };

  const handleLink = async () => {
    const openalexId = extractOpenAlexId(inputValue);
    if (!openalexId) {
      setError("Введите OpenAlex ID или URL (например, A5023888391 или https://openalex.org/A5023888391)");
      return;
    }
    setLinking(true);
    setError(null);
    try {
      await apiRequest("/profile/openalex/link", {
        method: "POST",
        body: JSON.stringify({ openalex_id: openalexId }),
      });
      await onOpenAlexLinked?.();
      setInputValue("");
      showToast("OpenAlex ID привязан");
    } catch (e) {
      setError(e.message);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm("Отвязать OpenAlex ID от аккаунта?")) return;
    setUnlinking(true);
    setError(null);
    try {
      await apiRequest("/profile/openalex/unlink", { method: "DELETE" });
      await onOpenAlexLinked?.();
      showToast("OpenAlex ID отвязан");
    } catch (e) {
      setError(e.message);
    } finally {
      setUnlinking(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      await apiRequest("/profile/openalex/import", { method: "POST" });
      await onOpenAlexLinked?.();
      showToast("Данные обновлены");
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  const openalexUrl = hasOpenAlex ? `https://openalex.org/${profile.openalex_id}` : null;

  return (
    <div className={`profile-section openalex-section ${compact ? "openalex-section--compact" : ""}`}>
      {!compact && (
        <>
          <h3 className="profile-section-title">OpenAlex</h3>
          <p className="profile-section-desc">
            OpenAlex ID используется для импорта публикаций и метрик (h-индекс) в профиль исследователя
          </p>
        </>
      )}
      {error && (
        <div
          className="auth-alert auth-alert-error"
          role="alert"
          style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Закрыть"
            style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", opacity: 0.7, flexShrink: 0 }}
          >
            ×
          </button>
        </div>
      )}
      {hasOpenAlex ? (
        <div className="orcid-status orcid-status--connected openalex-status">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <OpenAlexIcon />
            <span className="orcid-label">OpenAlex ID привязан:</span>{" "}
            <a href={openalexUrl} target="_blank" rel="noopener noreferrer" className="orcid-link">
              {profile.openalex_id}
            </a>
          </div>
          <div className="orcid-actions">
            <a
              href={openalexUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-btn-outline"
            >
              Открыть в OpenAlex
            </a>
            <button
              type="button"
              className="profile-btn-outline"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? "Обновление..." : "Обновить"}
            </button>
            <button
              type="button"
              className="profile-btn-outline"
              onClick={handleUnlink}
              disabled={unlinking}
            >
              {unlinking ? "Отвязываем..." : "Отвязать"}
            </button>
          </div>
        </div>
      ) : (
        <div className="orcid-status orcid-status--disconnected openalex-status">
          <p style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
            <OpenAlexIcon />
            OpenAlex ID не привязан
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="OpenAlex ID или URL (например A5023888391)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="profile-input"
            />
            <button
              type="button"
              className="profile-btn-integration profile-btn-integration--openalex"
              onClick={handleLink}
              disabled={linking}
            >
              {linking ? "Добавляем..." : "Добавить OpenAlex"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
