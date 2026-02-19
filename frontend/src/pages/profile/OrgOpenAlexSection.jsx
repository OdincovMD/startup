import React, { useState } from "react";
import { apiRequest } from "../../api/client";

export default function OrgOpenAlexSection({ orgProfile, onOrgRorLinked }) {
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
    <div className="profile-section openalex-section" style={{ marginTop: "1.5rem" }}>
      <h4 className="profile-section-title" style={{ fontSize: "1rem" }}>OpenAlex / ROR</h4>
      <p className="profile-section-desc" style={{ marginBottom: "0.75rem" }}>
        ROR ID организации для импорта данных из OpenAlex (название, адрес, сайт, аватар)
      </p>
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
      {hasRor ? (
        <div className="orcid-status orcid-status--connected openalex-status">
          <div>
            <span className="orcid-label">ROR ID привязан:</span>{" "}
            <a href={rorUrl} target="_blank" rel="noopener noreferrer" className="orcid-link">
              {orgProfile.ror_id}
            </a>
          </div>
          <div className="orcid-actions" style={{ marginTop: "0.5rem" }}>
            <a
              href={rorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-btn-outline"
            >
              Открыть в ROR
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
          <p>ROR ID не привязан</p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
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
              {linking ? "Добавляем..." : "Добавить ROR"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
