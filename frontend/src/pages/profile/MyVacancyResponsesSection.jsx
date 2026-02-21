/**
 * Секция «Мои отклики»: отклики текущего пользователя (соискатель) на вакансии.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";

const STATUS_CONFIG = {
  new: { label: "На рассмотрении", className: "status-badge--pending" },
  accepted: { label: "Приглашение", className: "status-badge--success" },
  rejected: { label: "Отклонён", className: "status-badge--rejected" },
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
  const vacancyUrl = item.vacancy_public_id ? `/vacancies/${item.vacancy_public_id}` : "/vacancies";

  return (
    <Link to={vacancyUrl} className={`response-card response-card--${item.status || "new"}`}>
      <div className="response-card__main">
        <div className="response-card__title-row">
          <span className="response-card__title">{item.vacancy_name || "Вакансия"}</span>
          <span className={`status-badge ${status.className}`}>{status.label}</span>
        </div>
        {item.organization_name && (
          <div className="response-card__org">{item.organization_name}</div>
        )}
      </div>
      <div className="response-card__meta">
        <span className="response-card__date">{formatDate(item.created_at)}</span>
        <span className="response-card__arrow">→</span>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="responses-empty">
      <h4 className="responses-empty__title">У вас пока нет откликов</h4>
      <p className="responses-empty__text">
        Найдите интересную вакансию и откликнитесь — работодатель получит уведомление и сможет связаться с вами.
      </p>
      <Link to="/vacancies" className="primary-btn responses-empty__btn">
        Перейти к вакансиям
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="responses-loading">
      {[1, 2, 3].map((i) => (
        <div key={i} className="response-card response-card--skeleton">
          <div className="response-card__header">
            <div className="skeleton" style={{ width: 100, height: 24 }} />
            <div className="skeleton" style={{ width: 60, height: 16 }} />
          </div>
          <div className="response-card__body">
            <div className="skeleton" style={{ width: "70%", height: 20, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: "40%", height: 16 }} />
          </div>
        </div>
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
    <div className="profile-section profile-section--no-border">
      {!hideTitle && <h3 className="profile-section-title">Мои отклики</h3>}
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
          <div className="responses-items">
            {sortedList.map((item) => (
              <ResponseCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
