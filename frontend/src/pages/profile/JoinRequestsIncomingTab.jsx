/**
 * Вкладка «Запросы на присоединение»: входящие заявки исследователей (lab) и лабораторий (org).
 * Стиль как у запросов/вакансий: lab-tab-header, profile-list, profile-list-card, lab-card-actions.
 */
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useToast } from "../../ToastContext";

export default function JoinRequestsIncomingTab({ roleKey, onError }) {
  const { showToast } = useToast();
  const [labRequests, setLabRequests] = useState([]);
  const [orgRequests, setOrgRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      if (roleKey === "lab_admin") {
        const [lab, org] = await Promise.all([
          apiRequest("/profile/join-requests/organization/lab"),
          apiRequest("/profile/join-requests/organization/org"),
        ]);
        setLabRequests(lab || []);
        setOrgRequests(org || []);
      } else if (roleKey === "lab_representative") {
        const lab = await apiRequest("/profile/join-requests/laboratories/lab");
        setLabRequests(lab || []);
        setOrgRequests([]);
      } else {
        setLabRequests([]);
        setOrgRequests([]);
      }
    } catch (e) {
      onError?.(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [roleKey]);

  const approveLab = async (id) => {
    setActionId(id);
    try {
      await apiRequest(`/profile/join-requests/lab/${id}/approve`, { method: "POST" });
      load();
      window.dispatchEvent(new CustomEvent("profile-refresh"));
      showToast("Заявка принята");
    } catch (e) {
      onError?.(e.message);
    } finally {
      setActionId(null);
    }
  };

  const rejectLab = async (id) => {
    setActionId(id);
    try {
      await apiRequest(`/profile/join-requests/lab/${id}/reject`, { method: "POST" });
      load();
      window.dispatchEvent(new CustomEvent("profile-refresh"));
      showToast("Заявка отклонена");
    } catch (e) {
      onError?.(e.message);
    } finally {
      setActionId(null);
    }
  };

  const approveOrg = async (id) => {
    setActionId(id);
    try {
      await apiRequest(`/profile/join-requests/org/${id}/approve`, { method: "POST" });
      load();
      window.dispatchEvent(new CustomEvent("profile-refresh"));
      showToast("Заявка принята");
    } catch (e) {
      onError?.(e.message);
    } finally {
      setActionId(null);
    }
  };

  const rejectOrg = async (id) => {
    setActionId(id);
    try {
      await apiRequest(`/profile/join-requests/org/${id}/reject`, { method: "POST" });
      load();
      window.dispatchEvent(new CustomEvent("profile-refresh"));
      showToast("Заявка отклонена");
    } catch (e) {
      onError?.(e.message);
    } finally {
      setActionId(null);
    }
  };

  const showLab = roleKey === "lab_admin" || roleKey === "lab_representative";
  const showOrg = roleKey === "lab_admin";

  if (!showLab && !showOrg) return null;

  if (loading) {
    return (
      <div className="profile-form">
        <div className="lab-tab-header">
          <p className="lab-tab-desc">Заявки на присоединение к лабораториям и организации. Одобряйте или отклоняйте входящие заявки.</p>
        </div>
        <p className="muted">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="profile-form">
      <div className="lab-tab-header">
        <p className="lab-tab-desc">Заявки на присоединение к лабораториям и организации. Одобряйте или отклоняйте входящие заявки.</p>
      </div>

      {showLab && (
        <div className="profile-form-group join-requests-section">
          <div className="profile-form-group-title">Заявки исследователей в лабораторию</div>
          <p className="profile-field-hint join-requests-hint">Исследователи просят присоединиться к вашим лабораториям.</p>
          <div className="profile-list">
            {labRequests.length === 0 ? (
              <p className="muted">Нет входящих заявок</p>
            ) : (
              labRequests.map((r) => (
                <div key={r.id} className="profile-list-card">
                  <div className="profile-list-content">
                    <div className="profile-list-title">
                      {r.researcher?.full_name || "Исследователь"} → {r.laboratory?.name || "Лаборатория"}
                    </div>
                    {r.researcher?.email && (
                      <div className="profile-list-text small muted">{r.researcher.email}</div>
                    )}
                  </div>
                  <div className="lab-card-actions">
                    <button
                      type="button"
                      className="primary-btn lab-btn-edit"
                      onClick={() => approveLab(r.id)}
                      disabled={actionId === r.id}
                    >
                      {actionId === r.id ? "Обработка…" : "Принять"}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn lab-btn-delete"
                      onClick={() => rejectLab(r.id)}
                      disabled={actionId === r.id}
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showOrg && (
        <div className="profile-form-group join-requests-section">
          <div className="profile-form-group-title">Заявки лабораторий в организацию</div>
          <p className="profile-field-hint join-requests-hint">Лаборатории просят войти в состав вашей организации.</p>
          <div className="profile-list">
            {orgRequests.length === 0 ? (
              <p className="muted">Нет входящих заявок</p>
            ) : (
              orgRequests.map((r) => (
                <div key={r.id} className="profile-list-card">
                  <div className="profile-list-content">
                    <div className="profile-list-title">
                      {r.laboratory?.name || "Лаборатория"} → {r.organization?.name || "Организация"}
                    </div>
                    {r.laboratory?.description && (
                      <div className="profile-list-text small muted">{r.laboratory.description}</div>
                    )}
                  </div>
                  <div className="lab-card-actions">
                    <button
                      type="button"
                      className="primary-btn lab-btn-edit"
                      onClick={() => approveOrg(r.id)}
                      disabled={actionId === r.id}
                    >
                      {actionId === r.id ? "Обработка…" : "Принять"}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn lab-btn-delete"
                      onClick={() => rejectOrg(r.id)}
                      disabled={actionId === r.id}
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
