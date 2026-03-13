/**
 * Вкладка «Запросы на присоединение»: входящие заявки исследователей (lab) и лабораторий (org).
 * Стиль как у запросов/вакансий: profile-section-card, dashboard-list-item.
 */
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useToast } from "../../ToastContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

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

  return (
    <Card variant="solid" padding="lg" className="profile-section-card">
      <div className="profile-section-header">
        <h2 className="profile-section-card__title" style={{ margin: 0 }}>
          Запросы на присоединение
        </h2>
      </div>
      <p className="profile-section-desc">
        Заявки на присоединение к лабораториям и организации. Одобряйте или отклоняйте входящие заявки.
      </p>

      {loading ? (
        <div className="profile-empty-state">
          <p className="muted">Загрузка…</p>
        </div>
      ) : (
        <>
          {showLab && (
            <div className="profile-form-group join-requests-section">
              <div className="profile-form-group-title">Заявки исследователей в лабораторию</div>
              <p className="profile-field-hint join-requests-hint">
                Исследователи просят присоединиться к вашим лабораториям.
              </p>
              <div className="profile-list">
                {labRequests.length === 0 ? (
                  <div className="profile-empty-state">Нет входящих заявок</div>
                ) : (
                  labRequests.map((r) => (
                    <Card key={r.id} variant="elevated" padding="md" className="dashboard-list-item">
                      <div className="dashboard-list-item__title-row">
                        <h4 className="dashboard-list-item__title">
                          {r.researcher?.full_name || "Исследователь"} → {r.laboratory?.name || "Лаборатория"}
                        </h4>
                      </div>
                      {r.researcher?.email && (
                        <div className="text-sm text-muted" style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                          {r.researcher.email}
                        </div>
                      )}
                      <div className="dashboard-list-item__actions">
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => approveLab(r.id)}
                          disabled={actionId === r.id}
                          loading={actionId === r.id}
                        >
                          Принять
                        </Button>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => rejectLab(r.id)}
                          disabled={actionId === r.id}
                        >
                          Отклонить
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {showOrg && (
            <div className="profile-form-group join-requests-section">
              <div className="profile-form-group-title">Заявки лабораторий в организацию</div>
              <p className="profile-field-hint join-requests-hint">
                Лаборатории просят войти в состав вашей организации.
              </p>
              <div className="profile-list">
                {orgRequests.length === 0 ? (
                  <div className="profile-empty-state">Нет входящих заявок</div>
                ) : (
                  orgRequests.map((r) => (
                    <Card key={r.id} variant="elevated" padding="md" className="dashboard-list-item">
                      <div className="dashboard-list-item__title-row">
                        <h4 className="dashboard-list-item__title">
                          {r.laboratory?.name || "Лаборатория"} → {r.organization?.name || "Организация"}
                        </h4>
                      </div>
                      {r.laboratory?.description && (
                        <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                          {r.laboratory.description}
                        </div>
                      )}
                      <div className="dashboard-list-item__actions">
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => approveOrg(r.id)}
                          disabled={actionId === r.id}
                          loading={actionId === r.id}
                        >
                          Принять
                        </Button>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => rejectOrg(r.id)}
                          disabled={actionId === r.id}
                        >
                          Отклонить
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
