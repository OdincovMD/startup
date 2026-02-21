/**
 * Боковая панель профиля: список разделов по роли; «Профиль организации» раскрывается подпунктами в сайдбаре.
 */
import React, { useState, useEffect } from "react";

const SECTIONS = [
  { id: "summary", labelKey: "summary", roles: ["lab_admin", "lab_representative", "student", "researcher"] },
  { id: "personal", labelKey: "personal", roles: ["lab_admin", "lab_representative", "student", "researcher"] },
  { id: "organization", labelKey: "organization", roles: ["lab_admin", "lab_representative"] },
  { id: "student", labelKey: "student", roles: ["student"] },
  { id: "researcher", labelKey: "researcher", roles: ["researcher"] },
  { id: "my-requests", labelKey: "my-requests", roles: ["lab_representative", "researcher"] },
  { id: "my-vacancy-responses", labelKey: "my-vacancy-responses", roles: ["student", "researcher"] },
];

const LABELS = {
  summary: "Обзор",
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
  return SECTIONS.filter((s) => s.roles.includes(roleKey)).map((s) => ({
    id: s.id,
    label: s.id === "organization" ? getOrgLabel(roleKey) : LABELS[s.labelKey],
  }));
}

const ORG_GROUP_DATA = "Данные организации";
const ORG_GROUP_CONTENT = "Контент";
const ORG_GROUP_RECRUIT = "Набор и отклики";

function getOrgSubItems(showProfileTab) {
  return [
    ...(showProfileTab ? [{ id: "profile", label: "Профиль", group: ORG_GROUP_DATA }] : []),
    { id: "labs", label: "Лаборатории", group: ORG_GROUP_DATA },
    { id: "equipment", label: "Оборудование", group: ORG_GROUP_DATA },
    { id: "staff", label: "Сотрудники", group: ORG_GROUP_DATA },
    { id: "tasks", label: "Задачи", group: ORG_GROUP_CONTENT },
    { id: "queries", label: "Запросы", group: ORG_GROUP_CONTENT },
    { id: "vacancies", label: "Вакансии", group: ORG_GROUP_RECRUIT },
    { id: "join-requests", label: "Запросы на присоединение", group: ORG_GROUP_RECRUIT },
    { id: "vacancy-responses", label: "Отклики на вакансии", group: ORG_GROUP_RECRUIT },
  ];
}

export default function ProfileSidebar({
  roleKey,
  currentSection,
  onSectionChange,
  orgTab,
  onOrgTabChange,
  showProfileTab = false,
}) {
  const items = getItemsForRole(roleKey);
  const isOrgSection = currentSection === "organization";
  const [orgExpanded, setOrgExpanded] = useState(isOrgSection);

  useEffect(() => {
    if (!isOrgSection) setOrgExpanded(false);
  }, [isOrgSection]);

  const handleOrgHeaderClick = () => {
    if (!isOrgSection) onSectionChange("organization");
    setOrgExpanded((prev) => !prev);
  };

  const handleOrgSubClick = (tabId) => {
    onSectionChange("organization");
    onOrgTabChange?.(tabId);
  };

  const orgSubItems = (roleKey === "lab_admin" || roleKey === "lab_representative")
    ? getOrgSubItems(showProfileTab)
    : [];

  return (
    <nav className="profile-sidebar" aria-label="Разделы профиля">
      <ul className="profile-sidebar__list">
        {items.map((item) => {
          if (item.id !== "organization") {
            return (
              <li key={item.id} className="profile-sidebar__list-item">
                <button
                  type="button"
                  className={`profile-sidebar__item ${currentSection === item.id ? "profile-sidebar__item--active" : ""}`}
                  onClick={() => onSectionChange(item.id)}
                  aria-current={currentSection === item.id ? "page" : undefined}
                >
                  {item.label}
                </button>
              </li>
            );
          }
          const expanded = orgExpanded || isOrgSection;
          return (
            <li
              key={item.id}
              className={`profile-sidebar__list-item profile-sidebar__list-item--with-children${expanded ? " profile-sidebar__list-item--expanded" : ""}`}
            >
              <button
                type="button"
                className={`profile-sidebar__item profile-sidebar__item--parent ${isOrgSection ? "profile-sidebar__item--active" : ""}`}
                onClick={handleOrgHeaderClick}
                aria-expanded={expanded}
                aria-current={isOrgSection ? "page" : undefined}
              >
                <span>{item.label}</span>
                <span className="profile-sidebar__expand-icon" aria-hidden="true">
                  {expanded ? "▼" : "▶"}
                </span>
              </button>
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
                            >
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
      </ul>
    </nav>
  );
}
