import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  UserPlus, 
  Beaker, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  ChevronRight, 
  Search, 
  Plus, 
  ArrowRight,
  LogOut,
  ClipboardList
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { useToast } from "../../ToastContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

const STATUS_CONFIG = {
  pending: { label: "На рассмотрении", variant: "accent", icon: Clock },
  approved: { label: "Принято", variant: "success", icon: CheckCircle2 },
  rejected: { label: "Отклонено", variant: "rejected", icon: XCircle },
  left: { label: "Покинуто", variant: "default", icon: LogOut },
  removed: { label: "Отвязан", variant: "default", icon: XCircle },
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
  const StatusIcon = status.icon;
  const labUrl = item.laboratory?.public_id ? `/laboratories/${item.laboratory.public_id}` : null;
  const orgUrl = item.organization?.public_id ? `/organizations/${item.organization.public_id}` : null;

  const title =
    type === "lab"
      ? item.laboratory?.name || "Лаборатория"
      : item.organization?.name || "Организация";
      
  const subTitle = type === "org" ? (item.laboratory?.name || "Лаборатория") : null;

  const linkUrl = type === "lab" ? labUrl : orgUrl;

  return (
    <Card variant="elevated" padding="none" className="join-request-modern-card" style={{ marginBottom: "0.75rem", overflow: "hidden" }}>
      <div style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div className="icon-box" style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--accent-bg)", color: "var(--accent)", display: "flex", alignItems: "center", justifyCenter: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            {type === "lab" ? <Beaker size={20} /> : <Building2 size={20} />}
          </div>
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {linkUrl ? <Link to={linkUrl} style={{ color: "inherit" }}>{title}</Link> : title}
              </h4>
              {subTitle && (
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.125rem" }}>
                  <span>{subTitle}</span>
                  <ArrowRight size={10} />
                  <span>Организация</span>
                </div>
              )}
            </div>
            <Badge variant={status.variant} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <StatusIcon size={12} />
              {status.label}
            </Badge>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            <Clock size={12} />
            <span>{formatDate(item.created_at)}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {item.status === "approved" && onLeave && (
            <Button
              variant="ghost"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm("Вы уверены, что хотите покинуть?")) {
                  onLeave();
                }
              }}
              style={{ color: "var(--danger)", padding: "0.4rem 0.75rem" }}
            >
              Покинуть
            </Button>
          )}
          <ChevronRight size={18} color="var(--border)" />
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ type, onAction }) {
  const isLab = type === "lab";
  return (
    <div className="profile-empty-state" style={{ textAlign: "center", padding: "3rem 1.5rem", background: "var(--nav-active-bg)", borderRadius: "16px", border: "1px dashed var(--border)" }}>
      <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", border: "1px solid var(--border-light)" }}>
        {isLab ? <UserPlus size={32} color="var(--text-muted)" /> : <Building2 size={32} color="var(--text-muted)" />}
      </div>
      <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
        {isLab ? "Нет заявок в лаборатории" : "Нет заявок в организации"}
      </h4>
      <p className="profile-list-text small muted" style={{ marginBottom: "1.5rem", maxWidth: "400px", margin: "0 auto 1.5rem", fontSize: "0.875rem", lineHeight: 1.5 }}>
        {isLab
          ? "Присоединитесь к лаборатории, чтобы стать её участником и получать уведомления о вакансиях."
          : "Привяжите вашу лабораторию к организации для совместной работы."}
      </p>
      <Button variant="primary" onClick={onAction} style={{ padding: "0.75rem 2rem" }}>
        {isLab ? "Присоединиться к лаборатории" : "Привязать к организации"}
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="requests-loading">
      {[1, 2].map((i) => (
        <Card key={i} variant="elevated" padding="md" className="dashboard-list-item" style={{ marginBottom: "0.75rem", opacity: 0.7 }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: "60%", height: 20, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "40%", height: 14 }} />
            </div>
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
      <div className="profile-section-header" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ClipboardList size={24} color="var(--accent)" />
          <div>
            <h2 className="profile-section-card__title" style={{ margin: 0, fontSize: "1.5rem" }}>
              Мои запросы
            </h2>
            <p className="profile-section-desc" style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem" }}>
              Заявки на вступление в лаборатории и организации
            </p>
          </div>
        </div>
        {!loading && (labList.length > 0 || orgList.length > 0) && (
          <Badge variant="accent" style={{ fontWeight: 700 }}>{labList.length + orgList.length}</Badge>
        )}
      </div>

      {roleKey === "researcher" && (
        <div className="requests-block-modern">
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
              <div className="profile-list requests-items-grid">
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

              {showLabForm ? (
                <Card variant="glass" padding="md" style={{ marginTop: "1.5rem", background: "var(--nav-active-bg)", border: "1px dashed var(--accent-soft)" }}>
                  <div style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "0.9375rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Plus size={16} /> Новая заявка в лабораторию
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <input
                      value={labInput}
                      onChange={(e) => setLabInput(e.target.value)}
                      placeholder="Введите ID лаборатории или выберите из списка"
                      list="lab-suggestions"
                      className="ui-input"
                      style={{ padding: "0.6rem 1rem" }}
                    />
                    <datalist id="lab-suggestions">
                      {labSuggestions.map((l) => (
                        <option key={l.id} value={l.public_id || ""} label={l.name} />
                      ))}
                    </datalist>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={joinLab}
                      disabled={joiningLab || !labInput.trim()}
                      loading={joiningLab}
                    >
                      Отправить заявку
                    </Button>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => {
                        setShowLabForm(false);
                        setLabInput("");
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </Card>
              ) : (
                <Button
                  variant="ghost"
                  style={{ marginTop: "1rem", width: "100%", border: "1px dashed var(--border)", borderRadius: "12px", height: "50px" }}
                  onClick={() => {
                    setShowLabForm(true);
                    loadLabSuggestions();
                  }}
                >
                  <Plus size={18} style={{ marginRight: "8px" }} /> Подать ещё заявку
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {roleKey === "lab_representative" && (
        <div className="requests-block-modern">
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
              <div className="profile-list requests-items-grid">
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

              {showOrgForm ? (
                <Card variant="glass" padding="md" style={{ marginTop: "1.5rem", background: "var(--nav-active-bg)", border: "1px dashed var(--accent-soft)" }}>
                  <div style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "0.9375rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Plus size={16} /> Привязать лабораторию к организации
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Организация</label>
                      <input
                        value={orgInput}
                        onChange={(e) => setOrgInput(e.target.value)}
                        placeholder="Введите ID организации"
                        list="org-suggestions"
                        className="ui-input"
                      />
                      <datalist id="org-suggestions">
                        {orgSuggestions.map((o) => (
                          <option key={o.id} value={o.public_id || ""} label={o.name} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Ваша лаборатория</label>
                      <input
                        value={labInputForOrg}
                        onChange={(e) => setLabInputForOrg(e.target.value)}
                        placeholder="Введите ID вашей лаборатории"
                        list="lab-for-org-suggestions"
                        className="ui-input"
                      />
                      <datalist id="lab-for-org-suggestions">
                        {labsForOrgForm.map((l) => (
                          <option key={l.id} value={l.public_id || ""} label={l.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={joinOrg}
                      disabled={joiningOrg || !orgInput.trim() || !labInputForOrg.trim()}
                      loading={joiningOrg}
                    >
                      Отправить заявку
                    </Button>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => {
                        setShowOrgForm(false);
                        setOrgInput("");
                        setLabInputForOrg("");
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </Card>
              ) : (
                <Button
                  variant="ghost"
                  style={{ marginTop: "1rem", width: "100%", border: "1px dashed var(--border)", borderRadius: "12px", height: "50px" }}
                  onClick={() => {
                    setShowOrgForm(true);
                    loadOrgSuggestions();
                    if (!creatorLabs?.length) loadLabSuggestions();
                  }}
                >
                  <Plus size={18} style={{ marginRight: "8px" }} /> Привязать ещё лабораторию
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
