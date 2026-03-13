/**
 * Вкладка «Отклики на вакансии»: отклики соискателей на вакансии текущего пользователя (работодатель).
 * Краткая статистика по вакансиям (просмотры, отклики). Полный дашборд — на вкладке «Дашборд».
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useToast } from "../../ToastContext";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

const STATUS_OPTIONS = [
  { value: "new", label: "Новый" },
  { value: "accepted", label: "Принят" },
  { value: "rejected", label: "Отклонён" },
];

const STATUS_CHIP = { new: "Новый", accepted: "Принят", rejected: "Отклонён" };

const BADGE_VARIANT = { new: "accent", accepted: "success", rejected: "rejected" };

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

  return (
    <Card variant="solid" padding="lg" className="profile-section-card">
      <div className="profile-section-header">
        <h2 className="profile-section-card__title" style={{ margin: 0 }}>
          Отклики на вакансии
        </h2>
      </div>
      <p className="profile-section-desc">
        Отклики соискателей на ваши вакансии. Меняйте статус: новый, принят, отклонён.
      </p>

      {loading ? (
        <div className="profile-empty-state">
          <p className="muted">Загрузка…</p>
        </div>
      ) : list.length === 0 ? (
        <div className="profile-empty-state">
          Пока нет откликов на ваши вакансии.
        </div>
      ) : (
        <>
          {vacancyStats.length > 0 && (
            <div className="profile-form-group vacancy-stats-block">
              <div className="profile-form-group-title">Статистика по вакансиям</div>
              <p className="profile-field-hint">
                Просмотры и отклики. Подробный дашборд — вкладка «Дашборд».
              </p>
              <div className="vacancy-stats-list">
                {vacancyStats.map((v) => (
                  <div key={v.vacancy_id} className="vacancy-stats-row">
                    <span className="vacancy-stats-name">{v.name || "Без названия"}</span>
                    <span className="vacancy-stats-meta">
                      Просмотров: {v.view_count ?? 0} · Откликов: {v.response_count ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="profile-list">
            {list.map((item) => (
              <Card key={item.id} variant="elevated" padding="md" className="dashboard-list-item">
                <div className="dashboard-list-item__title-row">
                  <h4 className="dashboard-list-item__title">
                    {item.applicant_public_id ? (
                      <Link
                        to={`/applicants/${item.applicant_public_id}`}
                        className="profile-list-title-link"
                      >
                        {item.applicant_name || "Соискатель"}
                      </Link>
                    ) : (
                      item.applicant_name || "Соискатель"
                    )}
                  </h4>
                  <Badge variant={BADGE_VARIANT[item.status] ?? "default"} className="dashboard-list-item__badge">
                    {STATUS_CHIP[item.status] ?? item.status}
                  </Badge>
                </div>
                  {item.vacancy_name && (
                    <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                      Вакансия: {item.vacancy_name}
                    </div>
                  )}
                  {item.applicant_preview && (
                    <p className="text-sm m-0" style={{ fontSize: "0.875rem", margin: 0 }}>{item.applicant_preview}</p>
                  )}
                  {item.created_at && (
                    <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                      {new Date(item.created_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  )}
                <div className="dashboard-list-item__actions">
                  <select
                    className="vacancy-response-status-select ui-input"
                    value={item.status}
                    onChange={(e) => updateStatus(item.id, e.target.value)}
                    disabled={updatingId === item.id}
                    aria-label={`Статус отклика ${item.applicant_name || item.id}`}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {updatingId === item.id && (
                    <span className="muted">Сохранение…</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
