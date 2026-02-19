/**
 * Вкладка «Мои запросы»: заявки в лаборатории (researcher) и в организации (lab_rep).
 */
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";

const STATUS_LABELS = {
  pending: "На рассмотрении",
  approved: "Принято",
  rejected: "Отклонено",
  left: "Покинуто",
  removed: "Отвязан",
};

export default function MyJoinRequestsSection({ roleKey, onError, creatorLabs = [] }) {
  const [data, setData] = useState({ lab: [], org: [] });
  const [loading, setLoading] = useState(true);
  const [joiningLab, setJoiningLab] = useState(false);
  const [joiningOrg, setJoiningOrg] = useState(false);
  const [labInput, setLabInput] = useState("");
  const [orgInput, setOrgInput] = useState("");
  const [labInputForOrg, setLabInputForOrg] = useState("");
  const [labSuggestions, setLabSuggestions] = useState([]);
  const [orgSuggestions, setOrgSuggestions] = useState([]);
  const [showLabForm, setShowLabForm] = useState(false);
  const [showOrgForm, setShowOrgForm] = useState(false);

  const load = async () => {
    try {
      const res = await apiRequest("/profile/join-requests");
      setData(res || { lab: [], org: [] });
    } catch (e) {
      onError?.(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const joinLab = async () => {
    const pid = labInput.trim();
    if (!pid) return;
    setJoiningLab(true);
    onError?.(null);
    try {
      await apiRequest("/profile/join-requests/lab", {
        method: "POST",
        body: JSON.stringify({ lab_public_id: pid }),
      });
      setLabInput("");
      setShowLabForm(false);
      load();
      window.dispatchEvent(new CustomEvent("profile-refresh"));
    } catch (e) {
      onError?.(e.message);
    } finally {
      setJoiningLab(false);
    }
  };

  const joinOrg = async () => {
    const orgPid = orgInput.trim();
    const labPid = labInputForOrg.trim();
    if (!orgPid || !labPid) return;
    setJoiningOrg(true);
    onError?.(null);
    try {
      await apiRequest("/profile/join-requests/org", {
        method: "POST",
        body: JSON.stringify({ org_public_id: orgPid, lab_public_id: labPid }),
      });
      setOrgInput("");
      setLabInputForOrg("");
      setShowOrgForm(false);
      load();
      window.dispatchEvent(new CustomEvent("profile-refresh"));
    } catch (e) {
      onError?.(e.message);
    } finally {
      setJoiningOrg(false);
    }
  };

  const leaveLab = async (laboratoryId) => {
    try {
      await apiRequest(`/profile/join-requests/lab/${laboratoryId}`, { method: "DELETE" });
      load();
      window.dispatchEvent(new CustomEvent("profile-refresh"));
    } catch (e) {
      onError?.(e.message);
    }
  };

  const leaveOrg = async (requestId) => {
    try {
      await apiRequest(`/profile/join-requests/org/${requestId}`, { method: "DELETE" });
      load();
      window.dispatchEvent(new CustomEvent("profile-refresh"));
    } catch (e) {
      onError?.(e.message);
    }
  };

  const loadLabSuggestions = async () => {
    try {
      const list = await apiRequest("/laboratories/");
      setLabSuggestions(list || []);
    } catch {
      setLabSuggestions([]);
    }
  };

  const labsForOrgForm = creatorLabs?.length ? creatorLabs : labSuggestions;

  const loadOrgSuggestions = async () => {
    try {
      const list = await apiRequest("/labs/");
      setOrgSuggestions(list || []);
    } catch {
      setOrgSuggestions([]);
    }
  };

  const hasLabRequests = roleKey === "researcher" && (data.lab?.length ?? 0) > 0;
  const hasOrgRequests = roleKey === "lab_representative" && (data.org?.length ?? 0) > 0;
  const showSection = roleKey === "researcher" || roleKey === "lab_representative";

  if (!showSection) return null;

  if (loading) return <p className="profile-section-desc">Загрузка…</p>;

  return (
    <div className="profile-section">
      <h3 className="profile-section-title">Мои запросы</h3>
      {roleKey === "researcher" && (
        <div className="join-requests-block">
          <h4>Заявки в лаборатории</h4>
          {!showLabForm ? (
            <button className="primary-btn" onClick={() => { setShowLabForm(true); loadLabSuggestions(); }}>
              Присоединиться к лаборатории
            </button>
          ) : (
            <div className="join-request-form">
              <input
                value={labInput}
                onChange={(e) => setLabInput(e.target.value)}
                placeholder="Public ID лаборатории"
                list="lab-suggestions"
              />
              <datalist id="lab-suggestions">
                {labSuggestions.map((l) => (
                  <option key={l.id} value={l.public_id || ""} label={l.name} />
                ))}
              </datalist>
              <div className="join-request-form-actions">
                <button className="primary-btn" onClick={joinLab} disabled={joiningLab || !labInput.trim()}>
                  {joiningLab ? "…" : "Отправить заявку"}
                </button>
                <button className="ghost-btn" onClick={() => { setShowLabForm(false); setLabInput(""); }}>
                  Отмена
                </button>
              </div>
            </div>
          )}
          <ul className="join-requests-list">
            {(data.lab || []).map((r) => (
              <li key={r.id} className={`join-request-item status-${r.status}`}>
                <div className="join-request-item-content">
                  <div className="join-request-item-title">{r.laboratory?.name || "Лаборатория"}</div>
                  <div className="join-request-item-status">{STATUS_LABELS[r.status] || r.status}</div>
                </div>
                {r.status === "approved" && r.laboratory?.id && (
                  <div className="join-request-item-actions">
                    <button className="outline-danger-btn small" onClick={() => leaveLab(r.laboratory.id)}>
                      Покинуть
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {(!data.lab || data.lab.length === 0) && !showLabForm && (
            <p className="profile-section-desc">Нет заявок в лаборатории</p>
          )}
        </div>
      )}
      {roleKey === "lab_representative" && (
        <div className="join-requests-block">
          <h4>Заявки в организацию</h4>
          {!showOrgForm ? (
            <button className="primary-btn" onClick={() => { setShowOrgForm(true); loadOrgSuggestions(); if (!creatorLabs?.length) loadLabSuggestions(); }}>
              Привязать лабораторию к организации
            </button>
          ) : (
            <div className="join-request-form">
              <input
                value={orgInput}
                onChange={(e) => setOrgInput(e.target.value)}
                placeholder="Public ID организации"
                list="org-suggestions"
              />
              <datalist id="org-suggestions">
                {orgSuggestions.map((o) => (
                  <option key={o.id} value={o.public_id || ""} label={o.name} />
                ))}
              </datalist>
              <input
                value={labInputForOrg}
                onChange={(e) => setLabInputForOrg(e.target.value)}
                placeholder="Public ID вашей лаборатории"
                list="lab-for-org-suggestions"
              />
              <datalist id="lab-for-org-suggestions">
                {labsForOrgForm.map((l) => (
                  <option key={l.id} value={l.public_id || ""} label={l.name} />
                ))}
              </datalist>
              <div className="join-request-form-actions">
                <button className="primary-btn" onClick={joinOrg} disabled={joiningOrg || !orgInput.trim() || !labInputForOrg.trim()}>
                  {joiningOrg ? "…" : "Отправить заявку"}
                </button>
                <button className="ghost-btn" onClick={() => { setShowOrgForm(false); setOrgInput(""); setLabInputForOrg(""); }}>
                  Отмена
                </button>
              </div>
            </div>
          )}
          <ul className="join-requests-list">
            {(data.org || []).map((r) => (
              <li key={r.id} className={`join-request-item status-${r.status}`}>
                <div className="join-request-item-content">
                  <div className="join-request-item-title">{r.laboratory?.name || "Лаборатория"} → {r.organization?.name || "Организация"}</div>
                  <div className="join-request-item-status">{STATUS_LABELS[r.status] || r.status}</div>
                </div>
                {r.status === "approved" && r.id && (
                  <div className="join-request-item-actions">
                    <button className="outline-danger-btn small" onClick={() => leaveOrg(r.id)}>
                      Покинуть
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {(!data.org || data.org.length === 0) && !showOrgForm && (
            <p className="profile-section-desc">Нет заявок в организацию</p>
          )}
        </div>
      )}
    </div>
  );
}
