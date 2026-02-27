/**
 * Вкладка «Отклики на вакансии»: отклики соискателей на вакансии текущего пользователя (работодатель).
 * Краткая статистика по вакансиям (просмотры, отклики). Полный дашборд — на вкладке «Дашборд».
 */
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useToast } from "../../ToastContext";

const STATUS_OPTIONS = [
  { value: "new", label: "Новый" },
  { value: "accepted", label: "Принят" },
  { value: "rejected", label: "Отклонён" },
];

const STATUS_CHIP = { new: "Новый", accepted: "Принят", rejected: "Отклонён" };

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
      <div className="profile-form">
        <div className="lab-tab-header">
          <p className="lab-tab-desc">Отклики соискателей на ваши вакансии. Меняйте статус: новый, принят, отклонён.</p>
        </div>
        <p className="muted">Загрузка…</p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="profile-form">
        <div className="lab-tab-header">
          <p className="lab-tab-desc">Отклики соискателей на ваши вакансии. Меняйте статус: новый, принят, отклонён.</p>
        </div>
        <p className="muted">Пока нет откликов на ваши вакансии.</p>
      </div>
    );
  }

  return (
    <div className="profile-form">
      <div className="lab-tab-header">
        <p className="lab-tab-desc">Отклики соискателей на ваши вакансии. Меняйте статус: новый, принят, отклонён.</p>
      </div>
      {vacancyStats.length > 0 && (
        <div className="profile-form-group vacancy-stats-block">
          <div className="profile-form-group-title">Статистика по вакансиям</div>
          <p className="profile-field-hint">Просмотры и отклики. Подробный дашборд — вкладка «Дашборд».</p>
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
          <div key={item.id} className="profile-list-card">
            <div className="profile-list-content">
              <div className="profile-list-title">
                {item.applicant_name || "Соискатель"}
                <span className={`org-detail-chip org-detail-chip--status org-detail-chip--${item.status}`}>
                  {STATUS_CHIP[item.status] ?? item.status}
                </span>
              </div>
              {item.vacancy_name && (
                <div className="profile-list-text small muted vacancy-response-vacancy-name">
                  Вакансия: {item.vacancy_name}
                </div>
              )}
              {item.applicant_preview && (
                <div className="profile-list-text vacancy-response-meta">{item.applicant_preview}</div>
              )}
              {item.created_at && (
                <div className="profile-list-text small muted vacancy-response-date">
                  {new Date(item.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              )}
            </div>
            <div className="lab-card-actions vacancy-response-actions">
              <select
                className="vacancy-response-status-select"
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
              {updatingId === item.id && <span className="muted vacancy-response-saving">Сохранение…</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
