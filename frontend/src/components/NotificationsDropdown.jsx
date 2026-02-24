/**
 * Иконка уведомлений с бейджем и выпадающей панелью.
 * Стиль в духе проекта: карточка, список-карточки, типография profile-list.
 */
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";

const TYPE_LABELS = {
  lab_join_request_created: "Новая заявка в лабораторию",
  lab_join_approved: "Заявка в лабораторию принята",
  lab_join_rejected: "Заявка в лабораторию отклонена",
  lab_join_removed: "Вас отвязали от лаборатории",
  lab_deleted: "Лаборатория удалена или отвязана",
  org_join_request_created: "Новая заявка лаборатории в организацию",
  org_join_approved: "Заявка в организацию принята",
  org_join_rejected: "Заявка в организацию отклонена",
  org_join_left: "Лаборатория покинула организацию",
  vacancy_response_created: "Отклик на вакансию",
  vacancy_response_status_changed: "Статус отклика на вакансию",
};

function formatNotification(n) {
  const label = TYPE_LABELS[n.type] || n.type;
  const d = n.data || {};
  if (n.type === "lab_join_request_created") {
    return `${d.researcher_full_name || "Исследователь"} → ${d.lab_name || "лаборатория"}`;
  }
  if (n.type === "lab_join_approved" || n.type === "lab_join_rejected") {
    return d.lab_name || "лаборатория";
  }
  if (n.type === "lab_join_removed") {
    const labs = d.lab_names || [];
    return labs.join(", ") || "лаборатория";
  }
  if (n.type === "lab_deleted") {
    const name = (d && d.lab_name) ? d.lab_name : "лаборатория";
    return `«${name}» удалена или отвязана от организации`;
  }
  if (n.type === "org_join_request_created") {
    return d.lab_name || "лаборатория";
  }
  if (n.type === "org_join_left") {
    return `${d.lab_name || ""} → ${d.org_name || ""}`;
  }
  if (n.type === "org_join_approved" || n.type === "org_join_rejected") {
    return d.org_name || "организация";
  }
  if (n.type === "vacancy_response_created") {
    return `${d.applicant_name || "Соискатель"} · «${d.vacancy_name || "вакансия"}»`;
  }
  if (n.type === "vacancy_response_status_changed") {
    const statusLabels = { accepted: "принят", rejected: "отклонён", new: "новый" };
    const statusText = statusLabels[d.status] || d.status || "";
    return `«${d.vacancy_name || "вакансия"}» — ${statusText}`;
  }
  return label;
}

function getTypeLabel(n) {
  const t = n.type;
  if (t === "lab_deleted") return "Лаборатория удалена или отвязана";
  return TYPE_LABELS[t] || t;
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "только что";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин.`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч.`;
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function getNotificationLink(n) {
  switch (n.type) {
    case "lab_join_request_created":
    case "org_join_request_created":
    case "org_join_left":
      return { path: "/profile", tab: "join-requests" };
    case "lab_join_approved":
    case "lab_join_rejected":
    case "lab_join_removed":
    case "lab_deleted":
    case "org_join_approved":
    case "org_join_rejected":
      return { path: "/profile", tab: "my-requests" };
    case "vacancy_response_created":
    case "vacancy_response_status_changed":
      return { path: "/profile", tab: "vacancy-responses" };
    default:
      return { path: "/profile" };
  }
}

const NAVIGABLE_NOTIFICATION_TYPES = new Set([
  "lab_join_request_created",
  "lab_join_approved",
  "lab_join_rejected",
  "lab_join_removed",
  "lab_deleted",
  "org_join_request_created",
  "org_join_approved",
  "org_join_rejected",
  "org_join_left",
  "vacancy_response_created",
  "vacancy_response_status_changed",
]);

export default function NotificationsDropdown() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const loadUnread = async () => {
    try {
      const res = await apiRequest("/profile/notifications/unread-count");
      setUnreadCount(res?.count ?? 0);
    } catch {
      setUnreadCount(0);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const list = await apiRequest("/profile/notifications");
      setNotifications(list || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnread();
    const t = setInterval(loadUnread, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open]);

  const handleNotificationClick = async (n) => {
    try {
      await apiRequest(`/profile/notifications/${n.id}/read`, { method: "PATCH" });
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
      loadUnread();
      if (NAVIGABLE_NOTIFICATION_TYPES.has(n.type)) {
        setOpen(false);
        const { path, tab } = getNotificationLink(n);
        navigate(tab ? `${path}?tab=${tab}` : path);
        setTimeout(() => window.dispatchEvent(new CustomEvent("profile-refresh")), 100);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="notifications-dropdown" ref={ref}>
      <button
        type="button"
        className="notifications-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unreadCount ? `Уведомления: ${unreadCount} непрочитанных` : "Уведомления"}
      >
        <span className="notifications-trigger-icon" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>
        {unreadCount > 0 && (
          <span className="notifications-badge" aria-hidden>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="notifications-panel" role="dialog" aria-label="Список уведомлений">
          <div className="notifications-panel-header">
            <span className="notifications-panel-title">Уведомления</span>
            {unreadCount > 0 && (
              <span className="notifications-panel-count">{unreadCount}</span>
            )}
          </div>
          <div className="notifications-panel-body">
            {loading ? (
              <div className="notifications-empty">Загрузка…</div>
            ) : notifications.length === 0 ? (
              <div className="notifications-empty">Нет новых уведомлений</div>
            ) : (
              <ul className="notifications-list" role="list">
                {notifications.map((n) => (
                  <li key={n.id} className="notifications-list-item">
                    <button
                      type="button"
                      className={`notifications-item ${n.read_at ? "notifications-item--read" : "notifications-item--unread"}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <span className="notifications-item-type">{getTypeLabel(n)}</span>
                      <span className="notifications-item-text">{formatNotification(n)}</span>
                      <span className="notifications-item-meta">
                        <span className="notifications-item-date">{formatDate(n.created_at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
