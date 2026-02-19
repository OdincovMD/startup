import React, { useState, useEffect } from "react";
import { apiRequest } from "../../api/client";

const ORCID_ERROR_MESSAGES = {
  link_failed: "Не удалось привязать ORCID. Попробуйте снова.",
  orcid_already_linked:
    "Этот ORCID уже привязан к другому аккаунту. Войдите в тот аккаунт, чтобы использовать его, или отвяжите ORCID там, чтобы привязать к текущему.",
  user_not_found: "Пользователь не найден. Войдите снова.",
  requires_password_first:
    "Сначала установите пароль. Вы зарегистрировались через ORCID — без пароля вы потеряете доступ к аккаунту после отвязки.",
};

export default function OrcidProfileSection({ profile, orcidError, orcidLinked, onOrcidLinked, onOrcidErrorDismiss, compact }) {
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [error, setError] = useState(null);
  const [urlError, setUrlError] = useState(null);
  const [showLinkedSuccess, setShowLinkedSuccess] = useState(false);
  const [showSetPasswordForm, setShowSetPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", password_confirm: "" });
  const [passwordFormError, setPasswordFormError] = useState(null);

  useEffect(() => {
    if (orcidError && ORCID_ERROR_MESSAGES[orcidError]) {
      setUrlError(ORCID_ERROR_MESSAGES[orcidError]);
    }
  }, [orcidError]);

  useEffect(() => {
    if (orcidLinked) {
      setShowLinkedSuccess(true);
    }
  }, [orcidLinked]);

  const hasOrcid = Boolean(profile?.orcid);
  const hasPassword = profile?.has_password !== false;
  const needsPasswordBeforeUnlink = hasOrcid && !hasPassword;
  const displayError = error || urlError;

  const handleConnect = async () => {
    setLinking(true);
    setError(null);
    setUrlError(null);
    onOrcidErrorDismiss?.();
    try {
      const data = await apiRequest("/auth/orcid/link", {
        method: "POST",
        credentials: "include",
      });
      if (data?.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (e) {
      setError(e.message);
      setLinking(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setPasswordFormError(null);
    if (passwordForm.password.length < 8) {
      setPasswordFormError("Пароль должен быть не короче 8 символов");
      return;
    }
    if (passwordForm.password !== passwordForm.password_confirm) {
      setPasswordFormError("Пароли не совпадают");
      return;
    }
    setSettingPassword(true);
    try {
      await apiRequest("/auth/me/set-password", {
        method: "POST",
        body: JSON.stringify({
          password: passwordForm.password,
          password_confirm: passwordForm.password_confirm,
        }),
      });
      setPasswordForm({ password: "", password_confirm: "" });
      setShowSetPasswordForm(false);
      setError(null);
      onOrcidLinked?.();
    } catch (e) {
      setPasswordFormError(e.message);
    } finally {
      setSettingPassword(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm("Отвязать ORCID от аккаунта?")) return;
    setUnlinking(true);
    setError(null);
    setUrlError(null);
    try {
      await apiRequest("/auth/orcid/unlink", { method: "DELETE" });
      onOrcidLinked?.();
    } catch (e) {
      if (e.message?.includes("requires_password_first") || e.message === "requires_password_first") {
        setError(ORCID_ERROR_MESSAGES.requires_password_first);
        setShowSetPasswordForm(true);
      } else {
        setError(e.message);
      }
    } finally {
      setUnlinking(false);
    }
  };

  const orcidUrl = hasOrcid ? `https://orcid.org/${profile.orcid}` : null;

  return (
    <div className={`profile-section orcid-section ${compact ? "orcid-section--compact" : ""}`}>
      {!compact && (
        <>
          <h3 className="profile-section-title">ORCID</h3>
          <p className="profile-section-desc">
            ORCID iD используется для идентификации и интеграции с OpenAlex
          </p>
        </>
      )}
      {displayError && (
        <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{displayError}</span>
          <button
            type="button"
            onClick={() => { setError(null); setUrlError(null); onOrcidErrorDismiss?.(); }}
            aria-label="Закрыть"
            style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", opacity: 0.7, flexShrink: 0 }}
          >
            ×
          </button>
        </div>
      )}
      {showLinkedSuccess && hasOrcid && (
        <div className="auth-alert auth-alert-success" role="status" style={{ marginBottom: "0.75rem" }}>
          ORCID успешно подключён к вашему аккаунту
          <button
            type="button"
            onClick={() => setShowLinkedSuccess(false)}
            aria-label="Закрыть"
            style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", opacity: 0.7 }}
          >
            ×
          </button>
        </div>
      )}
      {hasOrcid ? (
        <div className="orcid-status orcid-status--connected">
          <img
            src="https://orcid.org/sites/default/files/images/orcid_24x24.png"
            alt=""
            width="24"
            height="24"
          />
          <div>
            <span className="orcid-label">ORCID уже подключён к вашему аккаунту:</span>{" "}
            <a href={orcidUrl} target="_blank" rel="noopener noreferrer" className="orcid-link">
              {profile.orcid}
            </a>
          </div>
          <div className="orcid-actions">
            <a
              href={orcidUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-btn-outline"
            >
              Открыть в ORCID
            </a>
            <button
              type="button"
              className="profile-btn-outline"
              onClick={handleUnlink}
              disabled={unlinking}
            >
              {unlinking ? "Отвязываем..." : "Отвязать"}
            </button>
          </div>
          {needsPasswordBeforeUnlink && !showSetPasswordForm && (
            <button
              type="button"
              className="profile-btn-outline"
              onClick={() => setShowSetPasswordForm(true)}
              style={{ marginTop: "0.75rem", fontSize: "0.875rem" }}
            >
              Установить пароль
            </button>
          )}
          {needsPasswordBeforeUnlink && showSetPasswordForm && (
            <div className="orcid-set-password" style={{ marginTop: "1rem", padding: "1rem", background: "rgba(148, 163, 184, 0.1)", borderRadius: "0.5rem" }}>
              <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", color: "var(--muted)" }}>
                Вы зарегистрировались через ORCID. Чтобы отвязать его, сначала установите пароль — иначе потеряете доступ к аккаунту.
              </p>
              <form onSubmit={handleSetPassword} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 280 }}>
                <input
                  type="password"
                  placeholder="Новый пароль (мин. 8 символов)"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, password: e.target.value }))}
                  className="profile-input"
                  minLength={8}
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  placeholder="Повторите пароль"
                  value={passwordForm.password_confirm}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, password_confirm: e.target.value }))}
                  className="profile-input"
                  autoComplete="new-password"
                />
                {passwordFormError && (
                  <span className="auth-alert auth-alert-error" style={{ fontSize: "0.8rem" }}>{passwordFormError}</span>
                )}
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button type="submit" className="primary-btn" disabled={settingPassword}>
                    {settingPassword ? "Сохранение..." : "Установить пароль"}
                  </button>
                  <button
                    type="button"
                    className="profile-btn-outline"
                    onClick={() => { setShowSetPasswordForm(false); setPasswordFormError(null); setPasswordForm({ password: "", password_confirm: "" }); }}
                  >
                    Скрыть
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="orcid-status orcid-status--disconnected">
          <p>ORCID не подключён</p>
          <button
            type="button"
            className="profile-btn-integration profile-btn-integration--orcid"
            onClick={handleConnect}
            disabled={linking}
            style={{ marginTop: "0.5rem" }}
          >
            <img
              src="https://orcid.org/sites/default/files/images/orcid_24x24.png"
              alt=""
              width="20"
              height="20"
            />
            {linking ? "Подключение..." : "Подключить ORCID"}
          </button>
        </div>
      )}
    </div>
  );
}
