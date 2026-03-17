/**
 * Вкладка «Запросы на присоединение»: входящие заявки исследователей (lab) и лабораторий (org).
 * Стиль как у запросов/вакансий: profile-section-card, join-request-card.
 */
import React, { useEffect, useState } from "react";
import { 
  UserPlus, 
  Beaker, 
  Check, 
  X, 
  Mail, 
  Info, 
  ArrowRight,
  ClipboardList,
  Building2,
  Users
} from "lucide-react";
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
      <p className="profile-section-desc" style={{ marginBottom: "1.5rem" }}>
        Заявки на присоединение к лабораториям и организации. Одобряйте или отклоняйте входящие заявки.
      </p>

      {loading ? (
        <div className="profile-empty-state">
          <p className="muted">Загрузка…</p>
        </div>
      ) : (
        <div className="join-requests-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {showLab && (
            <section className="join-requests-section">
              <div className="profile-form-group-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Users size={18} className="text-accent" />
                <span>Заявки исследователей в лабораторию</span>
              </div>
              <div className="profile-list">
                {labRequests.length === 0 ? (
                  <Card variant="glass" padding="md" className="profile-empty-state" style={{ minHeight: '120px' }}>
                    <p className="muted">Нет входящих заявок от исследователей</p>
                  </Card>
                ) : (
                  labRequests.map((r) => (
                    <Card key={r.id} variant="elevated" padding="none" className="join-request-card">
                      <div className="join-request-card__header">
                        <div className="join-request-card__title-group">
                          <div className="join-request-card__icon">
                            <UserPlus size={20} />
                          </div>
                          <div>
                            <h4 className="join-request-card__name">
                              {r.researcher?.full_name || "Исследователь"}
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="join-request-card__body">
                        <div className="join-request-meta">
                          <div className="join-request-meta-item">
                            <Beaker size={14} className="join-request-meta-item__icon" />
                            <div className="join-request-meta-item__content">
                              <span className="join-request-meta-item__label">В лабораторию</span>
                              <span className="join-request-meta-item__value">{r.laboratory?.name || "Лаборатория"}</span>
                            </div>
                          </div>
                          {r.researcher?.email && (
                            <div className="join-request-meta-item">
                              <Mail size={14} className="join-request-meta-item__icon" />
                              <div className="join-request-meta-item__content">
                                <span className="join-request-meta-item__label">Email</span>
                                <span className="join-request-meta-item__value">{r.researcher.email}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="join-request-card__footer">
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => approveLab(r.id)}
                          disabled={actionId === r.id}
                          loading={actionId === r.id}
                        >
                          <Check size={14} style={{ marginRight: '4px' }} /> Принять
                        </Button>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => rejectLab(r.id)}
                          disabled={actionId === r.id}
                        >
                          <X size={14} style={{ marginRight: '4px' }} /> Отклонить
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </section>
          )}

          {showOrg && (
            <section className="join-requests-section">
              <div className="profile-form-group-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Building2 size={18} className="text-accent" />
                <span>Заявки лабораторий в организацию</span>
              </div>
              <div className="profile-list">
                {orgRequests.length === 0 ? (
                  <Card variant="glass" padding="md" className="profile-empty-state" style={{ minHeight: '120px' }}>
                    <p className="muted">Нет входящих заявок от лабораторий</p>
                  </Card>
                ) : (
                  orgRequests.map((r) => (
                    <Card key={r.id} variant="elevated" padding="none" className="join-request-card">
                      <div className="join-request-card__header">
                        <div className="join-request-card__title-group">
                          <div className="join-request-card__icon">
                            <Beaker size={20} />
                          </div>
                          <div>
                            <h4 className="join-request-card__name">
                              {r.laboratory?.name || "Лаборатория"}
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="join-request-card__body">
                        <div className="join-request-meta">
                          <div className="join-request-meta-item">
                            <Building2 size={14} className="join-request-meta-item__icon" />
                            <div className="join-request-meta-item__content">
                              <span className="join-request-meta-item__label">В организацию</span>
                              <span className="join-request-meta-item__value">{r.organization?.name || "Организация"}</span>
                            </div>
                          </div>
                        </div>
                        {r.laboratory?.description && (
                          <div className="join-request-section">
                            <div className="join-request-section__header">
                              <ClipboardList size={14} />
                              <span>Описание лаборатории</span>
                            </div>
                            <p className="join-request-section__text">{r.laboratory.description}</p>
                          </div>
                        )}
                      </div>

                      <div className="join-request-card__footer">
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => approveOrg(r.id)}
                          disabled={actionId === r.id}
                          loading={actionId === r.id}
                        >
                          <Check size={14} style={{ marginRight: '4px' }} /> Принять
                        </Button>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => rejectOrg(r.id)}
                          disabled={actionId === r.id}
                        >
                          <X size={14} style={{ marginRight: '4px' }} /> Отклонить
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </Card>
  );
}
