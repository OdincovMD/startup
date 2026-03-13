/**
 * Секция «Мои отклики»: отклики текущего пользователя (соискатель) на вакансии.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

const STATUS_CONFIG = {
  new: { label: "На рассмотрении", variant: "accent" },
  accepted: { label: "Приглашение", variant: "success" },
  rejected: { label: "Отклонён", variant: "rejected" },
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
  const vacancyUrl = item.vacancy_public_id
    ? `/vacancies/${item.vacancy_public_id}`
    : "/vacancies";

  return (
    <Link to={vacancyUrl} className="response-card-link">
      <Card variant="elevated" padding="md" className="dashboard-list-item">
        <div className="profile-list-content">
          <div className="profile-list-title">
            <span>{item.vacancy_name || "Вакансия"}</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {item.organization_name && (
            <div className="profile-list-text small muted">
              {item.organization_name}
            </div>
          )}
          {item.created_at && (
            <div className="profile-list-text small muted">
              {formatDate(item.created_at)}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="profile-empty-state">
      <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>
        У вас пока нет откликов
      </h4>
      <p className="profile-list-text small muted" style={{ marginBottom: "1rem" }}>
        Найдите интересную вакансию и откликнитесь — работодатель получит уведомление и
        сможет связаться с вами.
      </p>
      <Button to="/vacancies" variant="primary">
        Перейти к вакансиям
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="responses-loading">
      {[1, 2, 3].map((i) => (
        <Card key={i} variant="elevated" padding="md" className="dashboard-list-item">
          <div className="profile-list-content">
            <div className="skeleton" style={{ width: 100, height: 24 }} />
            <div className="skeleton" style={{ width: 60, height: 16, marginTop: 6 }} />
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

  return (
    <Card variant="solid" padding="lg" className="profile-section-card">
      {!hideTitle && (
        <div className="profile-section-header">
          <h2 className="profile-section-card__title" style={{ margin: 0 }}>
            Мои отклики
          </h2>
        </div>
      )}
      <p className="profile-section-desc">
        История ваших откликов на вакансии
      </p>

      {loading ? (
        <LoadingSkeleton />
      ) : list.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="responses-list">
          <div className="responses-stats">
            <span className="responses-stat">Всего: {list.length}</span>
            {list.filter((r) => r.status === "accepted").length > 0 && (
              <span className="responses-stat responses-stat--success">
                Приглашений: {list.filter((r) => r.status === "accepted").length}
              </span>
            )}
            {list.filter((r) => r.status === "new").length > 0 && (
              <span className="responses-stat responses-stat--pending">
                На рассмотрении: {list.filter((r) => r.status === "new").length}
              </span>
            )}
          </div>
          <div className="profile-list responses-items">
            {sortedList.map((item) => (
              <ResponseCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
