/**
 * Секция «Мои отклики»: отклики текущего пользователя (соискатель) на вакансии.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Briefcase, 
  Building2, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Search,
  LayoutDashboard
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

const STATUS_CONFIG = {
  new: { label: "На рассмотрении", variant: "accent", icon: Clock },
  accepted: { label: "Приглашение", variant: "success", icon: CheckCircle2 },
  rejected: { label: "Отклонён", variant: "rejected", icon: XCircle },
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

function ResponseCard({ item }) {
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.new;
  const StatusIcon = status.icon;
  const vacancyUrl = item.vacancy_public_id
    ? `/vacancies/${item.vacancy_public_id}`
    : "/vacancies";

  return (
    <Link to={vacancyUrl} className="response-card-link-modern" style={{ textDecoration: "none", display: "block", marginBottom: "0.75rem" }}>
      <Card variant="elevated" padding="none" className="dashboard-list-item-modern" style={{ transition: "all 0.2s", overflow: "hidden" }}>
        <div style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div className="icon-box" style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--accent-bg)", color: "var(--accent)", display: "flex", alignItems: "center", justifyCenter: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
              <Briefcase size={20} />
            </div>
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.vacancy_name || "Вакансия"}
              </h4>
              <Badge variant={status.variant} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <StatusIcon size={12} />
                {status.label}
              </Badge>
            </div>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.25rem" }}>
              {item.organization_name && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                  <Building2 size={12} />
                  <span>{item.organization_name}</span>
                </div>
              )}
              {item.created_at && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                  <Calendar size={12} />
                  <span>{formatDate(item.created_at)}</span>
                </div>
              )}
            </div>
          </div>

          <ChevronRight size={18} color="var(--border)" style={{ flexShrink: 0 }} />
        </div>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="profile-empty-state" style={{ textAlign: "center", padding: "3rem 1.5rem", background: "var(--nav-active-bg)", borderRadius: "16px", border: "1px dashed var(--border)" }}>
      <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", border: "1px solid var(--border-light)", boxShadow: "0 4px 12px rgba(26, 35, 50, 0.05)" }}>
        <Search size={32} color="var(--accent)" />
      </div>
      <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
        У вас пока нет откликов
      </h4>
      <p className="profile-list-text small muted" style={{ marginBottom: "1.5rem", maxWidth: "400px", margin: "0 auto 1.5rem", fontSize: "0.875rem", lineHeight: 1.5 }}>
        Найдите интересную вакансию и откликнитесь — работодатель получит уведомление и
        сможет связаться с вами.
      </p>
      <Button to="/vacancies" variant="primary" style={{ padding: "0.75rem 2.5rem" }}>
        Перейти к вакансиям
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="responses-loading">
      {[1, 2, 3].map((i) => (
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

export default function MyVacancyResponsesSection({ hideTitle = false, onError }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await apiRequest("/profile/my-vacancy-responses");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      onError?.(e.message);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sortedList = [...list].sort((a, b) => {
    const order = { accepted: 0, new: 1, rejected: 2 };
    return (order[a.status] ?? 1) - (order[b.status] ?? 1);
  });

  const acceptedCount = list.filter((r) => r.status === "accepted").length;
  const newCount = list.filter((r) => r.status === "new").length;
  const rejectedCount = list.filter((r) => r.status === "rejected").length;

  return (
    <Card variant="solid" padding="lg" className="profile-section-card">
      <div className="profile-section-header" style={{ marginBottom: "2rem" }}>
        <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <LayoutDashboard size={24} color="var(--accent)" />
          <div>
            {!hideTitle && (
              <h2 className="profile-section-card__title" style={{ margin: 0, fontSize: "1.5rem" }}>
                Мои отклики
              </h2>
            )}
            <p className="profile-section-desc" style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem" }}>
              История и статусы ваших заявок на вакансии
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : list.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="responses-container-modern">
          {/* Stats Grid simillar to LaboratoriesTab */}
          <div className="responses-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <div className="lab-stat-box" style={{ background: "var(--nav-active-bg)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
              <div className="lab-stat-box__header" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                <Briefcase size={14} color="var(--accent)" />
                <span>Всего</span>
              </div>
              <div className="lab-stat-box__content" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {list.length}
              </div>
            </div>
            
            <div className="lab-stat-box" style={{ background: "rgba(34, 197, 94, 0.05)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(34, 197, 94, 0.1)" }}>
              <div className="lab-stat-box__header" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                <CheckCircle2 size={14} color="#15803d" />
                <span>Приглашения</span>
              </div>
              <div className="lab-stat-box__content" style={{ fontSize: "1.25rem", fontWeight: 700, color: "#15803d" }}>
                {acceptedCount}
              </div>
            </div>

            <div className="lab-stat-box" style={{ background: "var(--accent-bg)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--accent-soft)" }}>
              <div className="lab-stat-box__header" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                <Clock size={14} color="var(--accent)" />
                <span>В работе</span>
              </div>
              <div className="lab-stat-box__content" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent)" }}>
                {newCount}
              </div>
            </div>

            {rejectedCount > 0 && (
              <div className="lab-stat-box" style={{ background: "rgba(239, 68, 68, 0.05)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.1)" }}>
                <div className="lab-stat-box__header" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                  <XCircle size={14} color="#c53030" />
                  <span>Отказы</span>
                </div>
                <div className="lab-stat-box__content" style={{ fontSize: "1.25rem", fontWeight: 700, color: "#c53030" }}>
                  {rejectedCount}
                </div>
              </div>
            )}
          </div>
          
          <div className="responses-section-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Calendar size={16} color="var(--text-muted)" />
            <span style={{ fontWeight: 700, fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Последние отклики
            </span>
          </div>

          <div className="profile-list responses-items-list">
            {sortedList.map((item) => (
              <ResponseCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
