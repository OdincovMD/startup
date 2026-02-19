/**
 * Вкладка «Запросы на присоединение»: входящие заявки исследователей (lab) и лабораторий (org).
 */
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";

export default function JoinRequestsIncomingTab({ roleKey, onError }) {
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
    } catch (e) {
      onError?.(e.message);
    } finally {
      setActionId(null);
    }
  };

  const showLab = roleKey === "lab_admin" || roleKey === "lab_representative";
  const showOrg = roleKey === "lab_admin";

  if (!showLab && !showOrg) return null;

  if (loading) return <p className="profile-section-desc">Загрузка…</p>;

  return (
    <div className="join-requests-incoming">
      {showLab && (
        <div className="join-requests-block">
          <h4>Заявки исследователей в лабораторию</h4>
          {labRequests.length === 0 ? (
            <p className="profile-section-desc">Нет входящих заявок</p>
          ) : (
            <ul className="join-requests-list">
              {labRequests.map((r) => (
                <li key={r.id} className="join-request-item">
                  <div className="join-request-item-content">
                    <div className="join-request-item-title">{r.researcher?.full_name || "Исследователь"} → {r.laboratory?.name || "Лаборатория"}</div>
                  </div>
                  <div className="join-request-item-actions">
                    <button
                      className="primary-btn small"
                      onClick={() => approveLab(r.id)}
                      disabled={actionId === r.id}
                    >
                      Принять
                    </button>
                    <button
                      className="outline-danger-btn small"
                      onClick={() => rejectLab(r.id)}
                      disabled={actionId === r.id}
                    >
                      Отклонить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {showOrg && (
        <div className="join-requests-block">
          <h4>Заявки лабораторий в организацию</h4>
          {orgRequests.length === 0 ? (
            <p className="profile-section-desc">Нет входящих заявок</p>
          ) : (
            <ul className="join-requests-list">
              {orgRequests.map((r) => (
                <li key={r.id} className="join-request-item">
                  <div className="join-request-item-content">
                    <div className="join-request-item-title">{r.laboratory?.name || "Лаборатория"} → {r.organization?.name || "Организация"}</div>
                  </div>
                  <div className="join-request-item-actions">
                    <button
                      className="primary-btn small"
                      onClick={() => approveOrg(r.id)}
                      disabled={actionId === r.id}
                    >
                      Принять
                    </button>
                    <button
                      className="outline-danger-btn small"
                      onClick={() => rejectOrg(r.id)}
                      disabled={actionId === r.id}
                    >
                      Отклонить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
