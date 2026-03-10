/**
 * Боковая панель профиля: список разделов по роли; «Профиль организации» раскрывается подпунктами в сайдбаре.
 * Блок «Профиль организации» можно скрыть; выбор сохраняется в localStorage.
 */
import React, { useState, useEffect } from "react";

const ORG_HIDDEN_STORAGE_KEY = "profile_sidebar_org_hidden";

function getOrgHidden() {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(ORG_HIDDEN_STORAGE_KEY) === "1";
}

function setOrgHidden(hidden) {
  if (hidden) localStorage.setItem(ORG_HIDDEN_STORAGE_KEY, "1");
  else localStorage.removeItem(ORG_HIDDEN_STORAGE_KEY);
}

const SECTIONS = [
  { id: "summary", labelKey: "summary", roles: ["lab_admin", "lab_representative", "student", "researcher"] },
  { id: "personal", labelKey: "personal", roles: ["lab_admin", "lab_representative", "student", "researcher"] },
  { id: "subscription", labelKey: "subscription", roles: ["lab_admin", "lab_representative"] },
  { id: "organization", labelKey: "organization", roles: ["lab_admin", "lab_representative"] },
  { id: "student", labelKey: "student", roles: ["student"] },
  { id: "researcher", labelKey: "researcher", roles: ["researcher"] },
  { id: "my-requests", labelKey: "my-requests", roles: ["researcher"] },
  { id: "my-vacancy-responses", labelKey: "my-vacancy-responses", roles: ["student", "researcher"] },
];

const LABELS = {
  summary: "Обзор",
  subscription: "Подписка",
  personal: "Личные данные",
  organization: "Профиль организации",
  student: "Профиль студента",
  researcher: "Профиль исследователя",
  "my-requests": "Мои запросы",
  "my-vacancy-responses": "Мои отклики",
};

function getOrgLabel(roleKey) {
  return roleKey === "lab_representative" ? "Профиль лаборатории" : "Профиль организации";
}

function getItemsForRole(roleKey) {
  if (!roleKey) return [];
  return SECTIONS.filter((s) => s.roles.includes(roleKey)).map((s, i) => ({
    id: s.id,
    label: s.id === "organization" ? getOrgLabel(roleKey) : LABELS[s.labelKey],
    step: i + 1,
  }));
}

const ORG_GROUP_DATA = "Данные организации";
const ORG_GROUP_DATA_LAB = "Данные лаборатории";
const ORG_GROUP_CONTENT = "Контент";
const ORG_GROUP_RECRUIT = "Набор и отклики";

function getOrgSubItems(showProfileTab, roleKey) {
  const dataGroup = roleKey === "lab_representative" ? ORG_GROUP_DATA_LAB : ORG_GROUP_DATA;
  const items = [
    ...(showProfileTab ? [{ id: "profile", label: "Профиль", group: dataGroup }] : []),
    { id: "labs", label: "Лаборатории", group: dataGroup },
    { id: "equipment", label: "Оборудование", group: dataGroup },
    { id: "staff", label: "Сотрудники", group: dataGroup },
    { id: "tasks", label: "Задачи", group: ORG_GROUP_CONTENT },
    { id: "queries", label: "Запросы", group: ORG_GROUP_CONTENT },
    { id: "vacancies", label: "Вакансии", group: ORG_GROUP_RECRUIT },
    { id: "dashboard", label: "Дашборд", group: ORG_GROUP_RECRUIT },
    { id: "join-requests", label: "Запросы на присоединение", group: ORG_GROUP_RECRUIT },
    { id: "vacancy-responses", label: "Отклики на вакансии", group: ORG_GROUP_RECRUIT },
    ...(roleKey === "lab_representative" ? [{ id: "my-requests", label: "Мои запросы", group: ORG_GROUP_RECRUIT }] : []),
  ];
  return items.map((it, i) => ({ ...it, step: i + 1 }));
}

const ALLOWED_WHEN_UNVERIFIED = ["summary", "personal"];

export default function ProfileSidebar({
  roleKey,
  currentSection,
  onSectionChange,
  orgTab,
  onOrgTabChange,
  showProfileTab = false,
  emailVerified = true,
}) {
  const items = getItemsForRole(roleKey);
  const isOrgSection = currentSection === "organization";
  const [orgExpanded, setOrgExpanded] = useState(false);
  const [orgSectionHidden, setOrgSectionHiddenState] = useState(getOrgHidden);
  const isOrgRole = roleKey === "lab_admin" || roleKey === "lab_representative";
  const locked = !emailVerified;

  useEffect(() => {
    if (!isOrgSection) setOrgExpanded(false);
  }, [isOrgSection]);

  const setOrgSectionHidden = (hidden) => {
    setOrgSectionHiddenState(hidden);
    setOrgHidden(hidden);
    if (hidden && currentSection === "organization") onSectionChange("summary");
  };

  const handleOrgHeaderClick = () => {
    if (locked) return;
    if (!isOrgSection) onSectionChange("organization");
    setOrgExpanded((prev) => !prev);
  };

  const handleOrgSubClick = (tabId) => {
    if (locked) return;
    onSectionChange("organization");
    onOrgTabChange?.(tabId);
  };

  const handleHideOrg = (e) => {
    e.stopPropagation();
    setOrgSectionHidden(true);
  };

  const handleShowOrg = () => {
    setOrgSectionHidden(false);
    onSectionChange("organization");
  };

  const orgSubItems = isOrgRole ? getOrgSubItems(showProfileTab, roleKey) : [];
  const showOrgInList = isOrgRole && !orgSectionHidden;

  return (
    <nav className="profile-sidebar" aria-label="Разделы профиля">
      <ul className="profile-sidebar__list">
        {items.map((item) => {
          const itemLocked = locked && !ALLOWED_WHEN_UNVERIFIED.includes(item.id);
          if (item.id !== "organization") {
            return (
              <li key={item.id} className="profile-sidebar__list-item">
                <span
                  className={itemLocked ? "profile-sidebar__item-wrap profile-sidebar__item-wrap--locked" : "profile-sidebar__item-wrap"}
                  title={itemLocked ? "Подтвердите email для доступа" : undefined}
                >
                  <button
                    type="button"
                    className={`profile-sidebar__item ${currentSection === item.id ? "profile-sidebar__item--active" : ""} ${itemLocked ? "profile-sidebar__item--locked" : ""}`}
                    onClick={() => !itemLocked && onSectionChange(item.id)}
                    aria-current={currentSection === item.id ? "page" : undefined}
                    disabled={itemLocked}
                  >
                    {item.step != null && (
                      <span className="profile-sidebar__step" aria-hidden>{item.step}</span>
                    )}
                    {item.label}
                  </button>
                </span>
              </li>
            );
          }
          if (!showOrgInList) return null;
          const expanded = !locked && (orgExpanded || isOrgSection);
          return (
            <li
              key={item.id}
              className={`profile-sidebar__list-item profile-sidebar__list-item--with-children${expanded ? " profile-sidebar__list-item--expanded" : ""} ${locked ? " profile-sidebar__list-item--locked" : ""}`}
            >
              <div className="profile-sidebar__parent-row">
                <span
                  className={locked ? "profile-sidebar__item-wrap profile-sidebar__item-wrap--locked profile-sidebar__item-wrap--parent" : "profile-sidebar__item-wrap profile-sidebar__item-wrap--parent"}
                  title={locked ? "Подтвердите email для доступа" : undefined}
                >
                <button
                  type="button"
                  className={`profile-sidebar__item profile-sidebar__item--parent ${isOrgSection ? "profile-sidebar__item--active" : ""} ${locked ? "profile-sidebar__item--locked" : ""}`}
                  onClick={handleOrgHeaderClick}
                  aria-expanded={expanded}
                  aria-current={isOrgSection ? "page" : undefined}
                  disabled={locked}
                >
                  <span>{item.label}</span>
                  <span className="profile-sidebar__expand-icon" aria-hidden="true">
                    {expanded ? "▼" : "▶"}
                  </span>
                </button>
                </span>
                {!locked && (
                  <button
                    type="button"
                    className="profile-sidebar__hide-org"
                    onClick={handleHideOrg}
                    title="Скрыть блок из меню"
                    aria-label={
                      roleKey === "lab_representative"
                        ? "Скрыть профиль лаборатории из меню"
                        : "Скрыть профиль организации из меню"
                    }
                  >
                    −
                  </button>
                )}
              </div>
              {expanded && orgSubItems.length > 0 && (
                <ul className="profile-sidebar__sublist">
                  {(() => {
                    let lastGroup = "";
                    return orgSubItems.map((sub) => {
                      const showGroup = sub.group !== lastGroup;
                      if (showGroup) lastGroup = sub.group;
                      return (
                        <React.Fragment key={sub.id}>
                          {showGroup && (
                            <li className="profile-sidebar__subgroup" aria-hidden="true">
                              {sub.group}
                            </li>
                          )}
                          <li>
                            <button
                              type="button"
                              className={`profile-sidebar__subitem ${orgTab === sub.id ? "profile-sidebar__subitem--active" : ""}`}
                              onClick={() => handleOrgSubClick(sub.id)}
                              aria-current={orgTab === sub.id ? "page" : undefined}
                              disabled={locked}
                            >
                              {sub.step != null && (
                                <span className="profile-sidebar__substep" aria-hidden>{sub.step}</span>
                              )}
                              {sub.label}
                            </button>
                          </li>
                        </React.Fragment>
                      );
                    });
                  })()}
                </ul>
              )}
            </li>
          );
        })}
        {isOrgRole && orgSectionHidden && (
          <li className="profile-sidebar__list-item">
            <button
              type="button"
              className="profile-sidebar__item profile-sidebar__item--show-org"
              onClick={handleShowOrg}
              title="Вернуть блок в меню"
            >
              {roleKey === "lab_representative"
                ? "Показать профиль лаборатории"
                : "Показать профиль организации"}
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
