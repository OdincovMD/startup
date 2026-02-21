import React, { useState } from "react";
import { apiRequest } from "../../api/client";

const RorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function OrgOpenAlexSection({ orgProfile, onOrgRorLinked, compact = false }) {
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const hasRor = Boolean(orgProfile?.ror_id);

  const extractRorId = (val) => {
    if (!val?.trim()) return "";
    const v = val.trim();
    if (v.includes("ror.org/")) {
      return v.split("/").pop() || "";
    }
    return v;
  };

  const handleLink = async () => {
    const rorId = extractRorId(inputValue);
    if (!rorId) {
      setError("Введите ROR ID или URL (например, 0130frc33 или https://ror.org/0130frc33)");
      return;
    }
    setLinking(true);
    setError(null);
    try {
      await apiRequest("/profile/organization/openalex/link", {
        method: "POST",
        body: JSON.stringify({ ror_id: rorId }),
      });
      await onOrgRorLinked?.();
      setInputValue("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm("Отвязать ROR ID от организации?")) return;
    setUnlinking(true);
    setError(null);
    try {
      await apiRequest("/profile/organization/openalex/unlink", { method: "DELETE" });
      await onOrgRorLinked?.();
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
      await apiRequest("/profile/organization/openalex/import", { method: "POST" });
      await onOrgRorLinked?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  const rorUrl = hasRor ? `https://ror.org/${orgProfile.ror_id}` : null;

  return (
    <div className={`org-ror-section ${compact ? "org-ror-section--compact" : ""}`}>
      {!compact && (
        <>
          <h4 className="profile-form-group-title">OpenAlex / ROR</h4>
          <p className="profile-section-desc" style={{ marginBottom: "0.75rem" }}>
            ROR ID организации для импорта данных из OpenAlex (название, адрес, сайт, аватар)
          </p>
        </>
      )}
      {compact && <div className="org-ror-section__label">OpenAlex / ROR</div>}
      {error && (
        <div className="auth-alert auth-alert-error org-ror-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Закрыть" className="org-ror-error-dismiss">×</button>
        </div>
      )}
      {hasRor ? (
        <div className="org-ror-status org-ror-status--connected">
          <div className="org-ror-status__row">
            <RorIcon />
            <span className="orcid-label">ROR ID привязан:</span>{" "}
            <a href={rorUrl} target="_blank" rel="noopener noreferrer" className="orcid-link">
              {orgProfile.ror_id}
            </a>
          </div>
          <div className="orcid-actions">
            <a href={rorUrl} target="_blank" rel="noopener noreferrer" className="profile-btn-outline">
              Открыть в ROR
            </a>
            <button type="button" className="profile-btn-outline" onClick={handleImport} disabled={importing}>
              {importing ? "Обновление..." : "Обновить"}
            </button>
            <button type="button" className="profile-btn-outline" onClick={handleUnlink} disabled={unlinking}>
              {unlinking ? "Отвязываем..." : "Отвязать"}
            </button>
          </div>
        </div>
      ) : (
        <div className="org-ror-status org-ror-status--disconnected">
          <p className="org-ror-status__title">
            <RorIcon />
            ROR ID не привязан
          </p>
          <p className="org-ror-status__hint">Импорт названия, адреса, сайта и аватара из OpenAlex</p>
          <div className="org-ror-link-row">
            <input
              type="text"
              placeholder="ROR ID или URL (например 0130frc33)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="profile-input"
            />
            <button
              type="button"
              className="profile-btn-integration profile-btn-integration--ror"
              onClick={handleLink}
              disabled={linking}
            >
              {linking ? "Добавляем..." : "Привязать ROR"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
