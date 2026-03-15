/**
 * Вкладка «Отклики на вакансии»: отклики соискателей на вакансии текущего пользователя (работодатель).
 * Краткая статистика по вакансиям (просмотры, отклики). Полный дашборд — на вкладке «Дашборд».
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  User, 
  Briefcase, 
  Calendar, 
  TrendingUp, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ExternalLink
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { useToast } from "../../ToastContext";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

const STATUS_OPTIONS = [
  { value: "new", label: "Новый", icon: Clock },
  { value: "accepted", label: "Принят", icon: CheckCircle2 },
  { value: "rejected", label: "Отклонён", icon: XCircle },
];

const STATUS_CHIP = { new: "Новый", accepted: "Принят", rejected: "Отклонён" };
const BADGE_VARIANT = { new: "accent", accepted: "success", rejected: "rejected" };

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function VacancyResponsesIncomingTab({ onError }) {
  const { showToast } = useToast();
  const [list, setList] = useState([]);
  const [vacancyStats, setVacancyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const load = async () => {
    try {
      const data = await apiRequest("/profile/vacancy-responses");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      onError?.(e.message);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadVacancyStats = async () => {
    try {
      const data = await apiRequest("/profile/analytics/vacancy-stats");
      setVacancyStats(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setVacancyStats([]);
    }
  };

  useEffect(() => {
    load();
    loadVacancyStats();
  }, []);

  const updateStatus = async (responseId, status) => {
    setUpdatingId(responseId);
    try {
      await apiRequest(`/profile/vacancy-responses/${responseId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setList((prev) =>
        prev.map((r) => (r.id === responseId ? { ...r, status } : r))
      );
      window.dispatchEvent(new CustomEvent("profile-refresh"));
      showToast("Статус обновлён");
    } catch (e) {
      onError?.(e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <Card variant="solid" padding="lg" className="profile-section-card">
        <div className="profile-empty-state" style={{ padding: "4rem 0" }}>
          <div className="page-loader">
            <div className="page-loader__dots">
              <span /><span /><span />
            </div>
            <p className="page-loader__text">Загрузка откликов...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="solid" padding="lg" className="profile-section-card">
      <div className="profile-section-header" style={{ marginBottom: "1.5rem" }}>
        <h2 className="profile-section-card__title" style={{ margin: 0, fontSize: "1.5rem" }}>
          Отклики на вакансии
        </h2>
        <p className="profile-section-desc" style={{ marginTop: "0.5rem" }}>
          Управляйте откликами соискателей: просматривайте профили и меняйте статусы.
        </p>
      </div>

      {vacancyStats.length > 0 && (
        <div className="vacancy-stats-section" style={{ marginBottom: "2.5rem" }}>
          <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <TrendingUp size={18} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Статистика по вакансиям
            </span>
          </div>
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {vacancyStats.map((v) => (
              <div key={v.vacancy_id} className="stat-card-mini" style={{ padding: "1rem", borderRadius: "12px", background: "var(--nav-active-bg)", border: "1px solid var(--border-light)" }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem", fontSize: "0.9375rem" }}>{v.name || "Без названия"}</div>
                <div style={{ display: "flex", gap: "1rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  <span>Просмотров: <strong>{v.view_count ?? 0}</strong></span>
                  <span>Откликов: <strong>{v.response_count ?? 0}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="profile-empty-state" style={{ textAlign: "center", padding: "3rem 1rem", background: "var(--nav-active-bg)", borderRadius: "12px", border: "1px dashed var(--border)" }}>
          <User size={48} color="var(--text-muted)" style={{ marginBottom: "1rem", opacity: 0.5 }} />
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>Пока нет откликов на ваши вакансии.</p>
        </div>
      ) : (
        <div className="responses-list" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {list.map((item) => (
            <Card key={item.id} variant="elevated" padding="none" className="response-modern-card" style={{ transition: "all 0.2s" }}>
              <div className="response-card-inner" style={{ padding: "1.25rem", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                <div className="applicant-avatar-container" style={{ flexShrink: 0 }}>
                  <div className="applicant-avatar-circle" style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--accent-bg)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.25rem", border: "2px solid var(--page-bg)", boxShadow: "0 0 0 1px var(--border-light)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                      {getInitials(item.applicant_name)}
                    </div>
                  </div>
                </div>
                
                <div className="response-card-content" style={{ flex: 1, minWidth: "200px" }}>
                  <div className="response-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {item.applicant_name || "Соискатель"}
                      </h3>
                      {item.applicant_public_id && (
                        <Link to={`/applicants/${item.applicant_public_id}`} className="view-profile-link" style={{ fontSize: "0.8125rem", color: "var(--accent)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem", marginTop: "0.25rem" }}>
                          Просмотреть профиль <ExternalLink size={12} />
                        </Link>
                      )}
                    </div>
                    <Badge variant={BADGE_VARIANT[item.status] ?? "default"}>
                      {STATUS_CHIP[item.status] ?? item.status}
                    </Badge>
                  </div>

                  <div className="response-meta-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
                    {item.vacancy_name && (
                      <div className="meta-item" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                        <Briefcase size={14} color="var(--accent)" />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.vacancy_name}</span>
                      </div>
                    )}
                    {item.created_at && (
                      <div className="meta-item" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                        <Calendar size={14} color="var(--accent)" />
                        <span>
                          {new Date(item.created_at).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {item.applicant_preview && (
                    <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, background: "var(--page-bg-alt)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                      {item.applicant_preview}
                    </p>
                  )}

                  <div className="response-actions" style={{ display: "flex", alignItems: "center", gap: "1rem", borderTop: "1px solid var(--border-light)", paddingTop: "1rem" }}>
                    <div className="status-select-wrapper" style={{ position: "relative", flex: 1, maxWidth: "240px" }}>
                      <select
                        className="ui-input"
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem", cursor: "pointer" }}
                        value={item.status}
                        onChange={(e) => updateStatus(item.id, e.target.value)}
                        disabled={updatingId === item.id}
                        aria-label="Изменить статус"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {updatingId === item.id && (
                        <div style={{ position: "absolute", right: "2.5rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Обновление...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}
