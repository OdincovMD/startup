/**
 * Вкладка «Мои запросы»: заявки в лаборатории (researcher) и в организации (lab_rep).
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useToast } from "../../ToastContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

const STATUS_CONFIG = {
  pending: { label: "На рассмотрении", variant: "accent" },
  approved: { label: "Принято", variant: "success" },
  rejected: { label: "Отклонено", variant: "rejected" },
  left: { label: "Покинуто", variant: "default" },
  removed: { label: "Отвязан", variant: "default" },
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function RequestCard({ item, type, onLeave }) {
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const labUrl = item.laboratory?.public_id ? `/laboratories/${item.laboratory.public_id}` : null;
  const orgUrl = item.organization?.public_id ? `/organizations/${item.organization.public_id}` : null;

  const title =
    type === "lab"
      ? item.laboratory?.name || "Лаборатория"
      : `${item.laboratory?.name || "Лаборатория"} → ${item.organization?.name || "Организация"}`;

  const linkUrl = type === "lab" ? labUrl : orgUrl;

  return (
    <Card variant="elevated" padding="md" className="dashboard-list-item">
      <div className="dashboard-list-item__title-row">
        <h4 className="dashboard-list-item__title">
          {linkUrl ? (
            <Link to={linkUrl} className="profile-list-title-link">
              {title}
            </Link>
          ) : (
            <span>{title}</span>
          )}
        </h4>
        <Badge variant={status.variant} className="dashboard-list-item__badge">{status.label}</Badge>
      </div>
      {item.created_at && (
        <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          Подана: {formatDate(item.created_at)}
        </div>
      )}
      {item.status === "approved" && onLeave && (
        <div className="dashboard-list-item__actions">
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Вы уверены, что хотите покинуть?")) {
                onLeave();
              }
            }}
          >
            Покинуть
          </Button>
        </div>
      )}
    </Card>
  );
}

function EmptyState({ type, onAction }) {
  const isLab = type === "lab";
  return (
    <div className="profile-empty-state">
      <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>
        {isLab ? "Нет заявок в лаборатории" : "Нет заявок в организации"}
      </h4>
      <p className="profile-list-text small muted" style={{ marginBottom: "1rem" }}>
        {isLab
          ? "Присоединитесь к лаборатории, чтобы стать её участником и получать уведомления о вакансиях."
          : "Привяжите вашу лабораторию к организации для совместной работы."}
      </p>
      <Button variant="primary" onClick={onAction}>
        {isLab ? "Присоединиться к лаборатории" : "Привязать к организации"}
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="requests-loading">
      {[1, 2].map((i) => (
        <Card key={i} variant="elevated" padding="md" className="dashboard-list-item">
          <div className="profile-list-content">
            <div className="skeleton" style={{ width: "60%", height: 18 }} />
            <div className="skeleton" style={{ width: "30%", height: 14, marginTop: 6 }} />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function MyJoinRequestsSection({ roleKey, onError, creatorLabs = [] }) {
  const { showToast } = useToast();
  const [data, setData] = useState({ lab: [], org: [] });
  const [loading, setLoading] = useState(true);
  const [joiningLab, setJoiningLab] = useState(false);
  const [joiningOrg, setJoiningOrg] = useState(false);
  const [labInput, setLabInput] = useState("");
  const [orgInput, setOrgInput] = useState("");
  const [labInputForOrg, setLabInputForOrg] = useState("");
  const [labSuggestions, setLabSuggestions] = useState([]);
  const [orgSuggestions, setOrgSuggestions] = useState([]);
  const [showLabForm, setShowLabForm] = useState(false);
  const [showOrgForm, setShowOrgForm] = useState(false);

  const load = async () => {
    try {
      const res = await apiRequest("/profile/join-requests");
      setData(res || { lab: [], org: [] });
    } catch (e) {
      onError?.(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("profile-refresh", handler);
    return () => window.removeEventListener("profile-refresh", handler);
  }, []);

  const joinLab = async () => {
    const pid = labInput.trim();
    if (!pid) return;
    setJoiningLab(true);
    onError?.(null);
    try {
      await apiRequest("/profile/join-requests/lab", {
        method: "POST",
        body: JSON.stringify({ lab_public_id: pid }),
      });
      setLabInput("");
      setShowLabForm(false);
      load();
      window.dispatchEvent(new CustomEvent("profile-refresh"));
      showToast("Заявка отправлена");
    } catch (e) {
      onError?.(e.message);
    } finally {
      setJoiningLab(false);
    }
  };

  const joinOrg = async () => {
    const orgPid = orgInput.trim();
    const labPid = labInputForOrg.trim();
    if (!orgPid || !labPid) return;
    setJoiningOrg(true);
    onError?.(null);
    try {
      await apiRequest("/profile/join-requests/org", {
        method: "POST",
        body: JSON.stringify({ org_public_id: orgPid, lab_public_id: labPid }),
      });
      setOrgInput("");
      setLabInputForOrg("");
      setShowOrgForm(false);
      load();
      window.dispatchEvent(new CustomEvent("profile-refresh"));
      showToast("Заявка отправлена");
    } catch (e) {
      onError?.(e.message);
    } finally {
      setJoiningOrg(false);
    }
  };

  const leaveLab = async (laboratoryId) => {
    try {
      await apiRequest(`/profile/join-requests/lab/${laboratoryId}`, { method: "DELETE" });
      load();
      window.dispatchEvent(new CustomEvent("profile-refresh"));
      showToast("Вы покинули лабораторию");
    } catch (e) {
      onError?.(e.message);
    }
  };

  const leaveOrg = async (requestId) => {
    try {
      await apiRequest(`/profile/join-requests/org/${requestId}`, { method: "DELETE" });
      load();
      window.dispatchEvent(new CustomEvent("profile-refresh"));
      showToast("Лаборатория отвязана от организации");
    } catch (e) {
      onError?.(e.message);
    }
  };

  const loadLabSuggestions = async () => {
    try {
      const list = await apiRequest("/laboratories/");
      setLabSuggestions(list?.items ?? (Array.isArray(list) ? list : []));
    } catch {
      setLabSuggestions([]);
    }
  };

  const labsForOrgForm = creatorLabs?.length ? creatorLabs : labSuggestions;

  const loadOrgSuggestions = async () => {
    try {
      const list = await apiRequest("/labs/");
      setOrgSuggestions(list?.items ?? (Array.isArray(list) ? list : []));
    } catch {
      setOrgSuggestions([]);
    }
  };

  const showSection = roleKey === "researcher" || roleKey === "lab_representative";
  if (!showSection) return null;

  const labList = data.lab || [];
  const orgList = data.org || [];

  const sortedLabList = [...labList].sort((a, b) => {
    const order = { approved: 0, pending: 1, rejected: 2, left: 3, removed: 3 };
    return (order[a.status] ?? 2) - (order[b.status] ?? 2);
  });

  const sortedOrgList = [...orgList].sort((a, b) => {
    const order = { approved: 0, pending: 1, rejected: 2, left: 3, removed: 3 };
    return (order[a.status] ?? 2) - (order[b.status] ?? 2);
  });

  return (
    <Card variant="solid" padding="lg" className="profile-section-card">
      <div className="profile-section-header">
        <h2 className="profile-section-card__title" style={{ margin: 0 }}>
          Мои запросы
        </h2>
      </div>
      <p className="profile-section-desc">
        Заявки на вступление в лаборатории и организации
      </p>

      {roleKey === "researcher" && (
        <div className="requests-block">
          {loading ? (
            <LoadingSkeleton />
          ) : labList.length === 0 && !showLabForm ? (
            <EmptyState
              type="lab"
              onAction={() => {
                setShowLabForm(true);
                loadLabSuggestions();
              }}
            />
          ) : (
            <div className="requests-list">
              {labList.length > 0 && (
                <div className="requests-stats">
                  <span className="requests-stat">Всего: {labList.length}</span>
                  {labList.filter((r) => r.status === "approved").length > 0 && (
                    <span className="requests-stat requests-stat--success">
                      Принято: {labList.filter((r) => r.status === "approved").length}
                    </span>
                  )}
                  {labList.filter((r) => r.status === "pending").length > 0 && (
                    <span className="requests-stat requests-stat--pending">
                      На рассмотрении: {labList.filter((r) => r.status === "pending").length}
                    </span>
                  )}
                </div>
              )}

              {showLabForm && (
                <div className="request-form">
                  <div className="request-form__title">Новая заявка в лабораторию</div>
                  <div className="request-form__field">
                    <input
                      value={labInput}
                      onChange={(e) => setLabInput(e.target.value)}
                      placeholder="Введите ID лаборатории или выберите из списка"
                      list="lab-suggestions"
                      className="request-form__input"
                    />
                    <datalist id="lab-suggestions">
                      {labSuggestions.map((l) => (
                        <option key={l.id} value={l.public_id || ""} label={l.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="request-form__actions">
                    <Button
                      variant="primary"
                      onClick={joinLab}
                      disabled={joiningLab || !labInput.trim()}
                    >
                      {joiningLab ? "Отправка..." : "Отправить заявку"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowLabForm(false);
                        setLabInput("");
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}

              <div className="profile-list requests-items">
                {sortedLabList.map((r) => (
                  <RequestCard
                    key={r.id}
                    item={r}
                    type="lab"
                    onLeave={
                      r.status === "approved" && r.laboratory?.id
                        ? () => leaveLab(r.laboratory.id)
                        : null
                    }
                  />
                ))}
              </div>

              {!showLabForm && labList.length > 0 && (
                <Button
                  variant="ghost"
                  className="requests-add-btn"
                  onClick={() => {
                    setShowLabForm(true);
                    loadLabSuggestions();
                  }}
                >
                  + Подать ещё заявку
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {roleKey === "lab_representative" && (
        <div className="requests-block">
          {loading ? (
            <LoadingSkeleton />
          ) : orgList.length === 0 && !showOrgForm ? (
            <EmptyState
              type="org"
              onAction={() => {
                setShowOrgForm(true);
                loadOrgSuggestions();
                if (!creatorLabs?.length) loadLabSuggestions();
              }}
            />
          ) : (
            <div className="requests-list">
              {orgList.length > 0 && (
                <div className="requests-stats">
                  <span className="requests-stat">Всего: {orgList.length}</span>
                  {orgList.filter((r) => r.status === "approved").length > 0 && (
                    <span className="requests-stat requests-stat--success">
                      Принято: {orgList.filter((r) => r.status === "approved").length}
                    </span>
                  )}
                  {orgList.filter((r) => r.status === "pending").length > 0 && (
                    <span className="requests-stat requests-stat--pending">
                      На рассмотрении: {orgList.filter((r) => r.status === "pending").length}
                    </span>
                  )}
                </div>
              )}

              {showOrgForm && (
                <div className="request-form">
                  <div className="request-form__title">Привязать лабораторию к организации</div>
                  <div className="request-form__field">
                    <label className="request-form__label">Организация</label>
                    <input
                      value={orgInput}
                      onChange={(e) => setOrgInput(e.target.value)}
                      placeholder="Введите ID организации"
                      list="org-suggestions"
                      className="request-form__input"
                    />
                    <datalist id="org-suggestions">
                      {orgSuggestions.map((o) => (
                        <option key={o.id} value={o.public_id || ""} label={o.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="request-form__field">
                    <label className="request-form__label">Ваша лаборатория</label>
                    <input
                      value={labInputForOrg}
                      onChange={(e) => setLabInputForOrg(e.target.value)}
                      placeholder="Введите ID вашей лаборатории"
                      list="lab-for-org-suggestions"
                      className="request-form__input"
                    />
                    <datalist id="lab-for-org-suggestions">
                      {labsForOrgForm.map((l) => (
                        <option key={l.id} value={l.public_id || ""} label={l.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="request-form__actions">
                    <Button
                      variant="primary"
                      onClick={joinOrg}
                      disabled={
                        joiningOrg || !orgInput.trim() || !labInputForOrg.trim()
                      }
                    >
                      {joiningOrg ? "Отправка..." : "Отправить заявку"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowOrgForm(false);
                        setOrgInput("");
                        setLabInputForOrg("");
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}

              <div className="profile-list requests-items">
                {sortedOrgList.map((r) => (
                  <RequestCard
                    key={r.id}
                    item={r}
                    type="org"
                    onLeave={
                      r.status === "approved" && r.id ? () => leaveOrg(r.id) : null
                    }
                  />
                ))}
              </div>

              {!showOrgForm && orgList.length > 0 && (
                <Button
                  variant="ghost"
                  className="requests-add-btn"
                  onClick={() => {
                    setShowOrgForm(true);
                    loadOrgSuggestions();
                    if (!creatorLabs?.length) loadLabSuggestions();
                  }}
                >
                  + Привязать ещё лабораторию
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
