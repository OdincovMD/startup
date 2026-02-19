/**
 * Иконка уведомлений с бейджем и выпадающим списком.
 */
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";

const TYPE_LABELS = {
  lab_join_request_created: "Новая заявка в лабораторию",
  lab_join_approved: "Заявка в лабораторию принята",
  lab_join_rejected: "Заявка в лабораторию отклонена",
  lab_join_removed: "Вас отвязали от лаборатории",
  org_join_request_created: "Новая заявка лаборатории в организацию",
  org_join_approved: "Заявка в организацию принята",
  org_join_rejected: "Заявка в организацию отклонена",
  org_join_left: "Лаборатория покинула организацию",
};

function formatNotification(n) {
  const label = TYPE_LABELS[n.type] || n.type;
  const d = n.data || {};
  if (n.type === "lab_join_request_created") {
    return `${label}: ${d.researcher_full_name || ""} → ${d.lab_name || ""}`;
  }
  if (n.type === "lab_join_approved" || n.type === "lab_join_rejected") {
    return `${label}: ${d.lab_name || ""}`;
  }
  if (n.type === "lab_join_removed") {
    const labs = d.lab_names || [];
    return `${label}: ${labs.join(", ") || "лаборатория"}`;
  }
  if (n.type === "org_join_request_created") {
    return `${label}: ${d.lab_name || ""}`;
  }
  if (n.type === "org_join_left") {
    return `${label}: ${d.lab_name || ""} → ${d.org_name || ""}`;
  }
  if (n.type === "org_join_approved" || n.type === "org_join_rejected") {
    return `${label}: ${d.org_name || ""}`;
  }
  return label;
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "только что";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
    return d.toLocaleDateString("ru-RU");
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
    case "org_join_approved":
    case "org_join_rejected":
      return { path: "/profile", tab: "my-requests" };
    default:
      return { path: "/profile" };
  }
}

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
      setOpen(false);
      const { path, tab } = getNotificationLink(n);
      navigate(tab ? `${path}?tab=${tab}` : path);
      setTimeout(() => window.dispatchEvent(new CustomEvent("profile-refresh")), 100);
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

  return (
    <div className="notifications-dropdown" ref={ref}>
      <button
        type="button"
        className="notifications-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Уведомления${unreadCount ? ` (${unreadCount})` : ""}`}
      >
        <span className="notifications-icon" aria-hidden>🔔</span>
        {unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>
      {open && (
        <div className="notifications-panel">
          <div className="notifications-panel-header">Уведомления</div>
          {loading ? (
            <div className="notifications-panel-loading">Загрузка…</div>
          ) : notifications.length === 0 ? (
            <div className="notifications-panel-empty">Нет уведомлений</div>
          ) : (
            <ul className="notifications-list">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`notifications-item ${n.read_at ? "read" : "unread"} notifications-item--clickable`}
                  onClick={() => handleNotificationClick(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleNotificationClick(n);
                  }}
                >
                  <span className="notifications-item-text">{formatNotification(n)}</span>
                  <span className="notifications-item-date">{formatDate(n.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
