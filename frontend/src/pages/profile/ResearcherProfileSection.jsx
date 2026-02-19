import React, { useRef, useState } from "react";
import { isValidEmail, formatPhoneRU, normalizeWebsiteInput } from "../../utils/validation";

/**
 * Профиль исследователя — одна карточка с полями как у сотрудника + поиск работы.
 */
const fileNameFromUrl = (url) => {
  try {
    const withoutQuery = url.split("?")[0];
    const parts = withoutQuery.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "документ");
  } catch {
    return "документ";
  }
};

export default function ResearcherProfileSection({
  hideTitle = false,
  researcherProfile,
  handleResearcherChange,
  saveResearcher,
  uploadResearcherPhoto,
  uploadResearcherResume,
  uploadResearcherDocument,
  removeResearcherDocument,
  researchInterestOptions,
  saving,
  uploading,
  onFileInputRefsReady,
}) {
  const educationInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const [expandedEducation, setExpandedEducation] = useState(false);
  const [expandedPublications, setExpandedPublications] = useState(false);

  React.useEffect(() => {
    onFileInputRefsReady?.([photoInputRef, resumeInputRef, documentInputRef]);
  }, [onFileInputRefsReady]);
  const [emailError, setEmailError] = useState(null);

  const parseInterests = (raw) =>
    (raw || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const parseList = (raw) =>
    (raw || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const p = researcherProfile || {};
  const contacts = p.contacts || {};

  const handleEmailChange = (value) => {
    handleResearcherChange("contacts", { ...contacts, email: value });
    setEmailError(null);
  };

  const handleEmailBlur = () => {
    const email = (contacts.email || "").trim();
    if (email && !isValidEmail(email)) {
      setEmailError("Введите корректный email");
    } else {
      setEmailError(null);
    }
  };

  const handlePhoneChange = (value) => {
    handleResearcherChange("contacts", { ...contacts, phone: formatPhoneRU(value) });
  };

  const handleWebsiteBlur = () => {
    const website = (contacts.website || "").trim();
    if (website) {
      handleResearcherChange("contacts", { ...contacts, website: normalizeWebsiteInput(website) });
    }
  };

  const handleSave = () => {
    const email = (contacts.email || "").trim();
    if (email && !isValidEmail(email)) {
      setEmailError("Введите корректный email");
      return;
    }
    setEmailError(null);
    saveResearcher();
  };

  return (
    <div className="profile-section">
      {!hideTitle && <h3 className="profile-section-title">Профиль исследователя</h3>}
      <p className="profile-section-desc">Научная деятельность и поиск работы</p>
      <div className="profile-form">
        <label>
          ФИО
          <input
            value={p.full_name || ""}
            onChange={(e) => handleResearcherChange("full_name", e.target.value)}
            placeholder="Иванов Иван Иванович"
          />
        </label>
        <label>
          Фото
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => uploadResearcherPhoto(e.target.files?.[0])}
            disabled={uploading || saving}
          />
        </label>
        {p.photo_url && (
          <div className="employee-photo">
            <img src={p.photo_url} alt="Фото" />
            <button
              className="file-remove"
              onClick={() => handleResearcherChange("photo_url", "")}
            >
              ×
            </button>
          </div>
        )}
        <label>
          Учёная степень / звание
          <input
            value={p.academic_degree || ""}
            onChange={(e) => handleResearcherChange("academic_degree", e.target.value)}
            placeholder="Доктор химических наук"
          />
        </label>
        <label>
          Должности (через запятую)
          <input
            value={(p.positions || []).join(", ")}
            onChange={(e) =>
              handleResearcherChange("positions", parseList(e.target.value))
            }
            placeholder="Постдок, научный сотрудник"
          />
          <span className="profile-field-hint">Перечислите через запятую</span>
        </label>
        <label>
          Научные интересы (через запятую)
          <input
            value={(p.research_interests || []).join(", ")}
            onChange={(e) =>
              handleResearcherChange("research_interests", parseInterests(e.target.value))
            }
            list="researcher-interests"
            placeholder="Материаловедение, наноэнзимы"
          />
          <span className="profile-field-hint">Перечислите через запятую или выберите из кнопок ниже</span>
        </label>
        <datalist id="researcher-interests">
          {researchInterestOptions?.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        {researchInterestOptions?.length > 0 && (
          <div className="interest-options">
            {researchInterestOptions.map((item) => (
              <button
                key={item}
                type="button"
                className="ghost-btn"
                onClick={() => {
                  const current = p.research_interests || [];
                  const next = current.includes(item)
                    ? current.filter((x) => x !== item)
                    : [...current, item];
                  handleResearcherChange("research_interests", next);
                }}
              >
                + {item}
              </button>
            ))}
          </div>
        )}

        <div className={`profile-form-collapsible ${expandedEducation ? "expanded" : ""}`}>
          <button
            type="button"
            className="profile-form-collapsible-header"
            onClick={() => setExpandedEducation((prev) => !prev)}
            aria-expanded={expandedEducation}
          >
            Образование ({(p.education || []).length})
          </button>
          <div className="profile-form-collapsible-body">
            <span className="profile-field-hint" style={{ display: "block", marginBottom: "0.5rem" }}>Нажмите Enter или «Добавить» для добавления</span>
            <div className="inline-form">
              <input
                ref={educationInputRef}
                placeholder="Университет, факультет, год"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = e.currentTarget.value.trim();
                    if (v) {
                      handleResearcherChange("education", [...(p.education || []), v]);
                      e.currentTarget.value = "";
                    }
                  }
                }}
              />
              <button
                className="ghost-btn"
                onClick={() => {
                  const v = educationInputRef.current?.value?.trim();
                  if (v) {
                    handleResearcherChange("education", [...(p.education || []), v]);
                    educationInputRef.current.value = "";
                  }
                }}
              >
                Добавить
              </button>
            </div>
            {(p.education || []).map((item, index) => (
              <div key={`edu-${index}`} className="file-item">
                <span>{item}</span>
                <button
                  className="file-remove"
                  onClick={() =>
                    handleResearcherChange(
                      "education",
                      (p.education || []).filter((_, i) => i !== index)
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={`profile-form-collapsible ${expandedPublications ? "expanded" : ""}`}>
          <button
            type="button"
            className="profile-form-collapsible-header"
            onClick={() => setExpandedPublications((prev) => !prev)}
            aria-expanded={expandedPublications}
          >
            Публикации ({(p.publications || []).length})
          </button>
          <div className="profile-form-collapsible-body">
          {(p.publications || []).map((pub, index) => (
            <div key={`pub-${index}`} className="profile-edit">
              <label>
                Заголовок
                <input
                  value={pub.title || ""}
                  onChange={(e) => {
                    const next = [...(p.publications || [])];
                    next[index] = { ...next[index], title: e.target.value };
                    handleResearcherChange("publications", next);
                  }}
                  placeholder="Название статьи"
                />
              </label>
              <label>
                Ссылка
                <input
                  type="url"
                  value={pub.link || ""}
                  onChange={(e) => {
                    const next = [...(p.publications || [])];
                    next[index] = { ...next[index], link: e.target.value };
                    handleResearcherChange("publications", next);
                  }}
                  onBlur={(e) => {
                    const v = (e.target.value || "").trim();
                    if (v) {
                      const next = [...(p.publications || [])];
                      next[index] = { ...next[index], link: normalizeWebsiteInput(v) };
                      handleResearcherChange("publications", next);
                    }
                  }}
                  placeholder="example.com или https://..."
                />
              </label>
              <button
                className="file-remove"
                onClick={() =>
                  handleResearcherChange(
                    "publications",
                    (p.publications || []).filter((_, i) => i !== index)
                  )
                }
              >
                Удалить
              </button>
            </div>
          ))}
          <button
            className="ghost-btn"
            onClick={() =>
              handleResearcherChange("publications", [
                ...(p.publications || []),
                { title: "", link: "", source: "", notes: "" },
              ])
            }
          >
            + Добавить публикацию
          </button>
          </div>
        </div>

        <div className="profile-form">
          <div className="profile-label">Индексы цитирования</div>
          <div className="inline-form">
            <label>
              h-index WoS
              <input
                type="number"
                value={p.hindex_wos ?? ""}
                onChange={(e) =>
                  handleResearcherChange(
                    "hindex_wos",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="—"
              />
            </label>
            <label>
              h-index Scopus
              <input
                type="number"
                value={p.hindex_scopus ?? ""}
                onChange={(e) =>
                  handleResearcherChange(
                    "hindex_scopus",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="—"
              />
            </label>
            <label>
              h-index РИНЦ
              <input
                type="number"
                value={p.hindex_rsci ?? ""}
                onChange={(e) =>
                  handleResearcherChange(
                    "hindex_rsci",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="—"
              />
            </label>
          </div>
        </div>

        <div className="profile-form">
          <div className="profile-label">Контакты</div>
          <label>
            Email
            <input
              type="email"
              value={contacts.email || ""}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="email@example.com"
              autoComplete="email"
              className={emailError ? "error" : ""}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "researcher-email-error" : undefined}
            />
            {emailError && (
              <span id="researcher-email-error" className="profile-field-error">
                {emailError}
              </span>
            )}
          </label>
          <label>
            Телефон
            <input
              type="tel"
              value={contacts.phone ? formatPhoneRU(contacts.phone) : ""}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              autoComplete="tel"
              maxLength={18}
            />
            <span className="profile-field-hint">Формат: +7 (999) 123-45-67</span>
          </label>
          <label>
            Сайт
            <input
              type="url"
              value={contacts.website || ""}
              onChange={(e) =>
                handleResearcherChange("contacts", { ...contacts, website: e.target.value })
              }
              onBlur={handleWebsiteBlur}
              placeholder="example.com или https://..."
            />
            <span className="profile-field-hint">Будет отображаться как ссылка</span>
          </label>
          <label>
            Telegram
            <input
              value={contacts.telegram || ""}
              onChange={(e) =>
                handleResearcherChange("contacts", { ...contacts, telegram: e.target.value })
              }
              placeholder="@username"
            />
          </label>
        </div>

        <h4>Резюме и документы</h4>
        <label>
          Резюме / CV
          <input
            ref={resumeInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => uploadResearcherResume?.(e.target.files?.[0])}
            disabled={uploading || saving}
          />
        </label>
        {p.resume_url && (
          <div className="file-item">
            <a href={p.resume_url} target="_blank" rel="noopener noreferrer">
              {fileNameFromUrl(p.resume_url)}
            </a>
            <button
              className="file-remove"
              onClick={() => handleResearcherChange("resume_url", "")}
            >
              ×
            </button>
          </div>
        )}
        <label>
          Дополнительные документы (сертификаты, дипломы и т.д.)
          <input
            ref={documentInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            onChange={(e) => uploadResearcherDocument?.(e.target.files?.[0])}
            disabled={uploading || saving}
          />
        </label>
        {(p.document_urls || []).map((url, index) => (
          <div key={`doc-${index}`} className="file-item">
            <a href={url} target="_blank" rel="noopener noreferrer">
              {fileNameFromUrl(url)}
            </a>
            <button
              className="file-remove"
              onClick={() => removeResearcherDocument?.(index)}
            >
              ×
            </button>
          </div>
        ))}

        <h4>Поиск работы</h4>
        <label>
          Статус поиска
          <select
            value={p.job_search_status || ""}
            onChange={(e) =>
              handleResearcherChange("job_search_status", e.target.value || null)
            }
          >
            <option value="">—</option>
            <option value="active">Активно ищу</option>
            <option value="passive">Рассматриваю предложения</option>
            <option value="not_active">Не ищу</option>
          </select>
        </label>
        <label>
          Желаемые должности (через запятую)
          <input
            value={(p.desired_positions || []).join(", ")}
            onChange={(e) =>
              handleResearcherChange("desired_positions", parseList(e.target.value))
            }
            placeholder="Постдок, научный сотрудник"
          />
          <span className="profile-field-hint">Перечислите через запятую</span>
        </label>
        <label>
          Предпочтительный тип занятости (через запятую)
          <input
            value={(p.employment_type_preference || []).join(", ")}
            onChange={(e) =>
              handleResearcherChange(
                "employment_type_preference",
                parseList(e.target.value)
              )
            }
            placeholder="Полная, частичная, удалённо"
          />
          <span className="profile-field-hint">Перечислите через запятую</span>
        </label>
        <label>
          Предпочтительный регион
          <input
            value={p.preferred_region || ""}
            onChange={(e) => handleResearcherChange("preferred_region", e.target.value)}
            placeholder="Москва, Санкт-Петербург"
          />
        </label>
        <label>
          Дата выхода на работу
          <input
            value={p.availability_date || ""}
            onChange={(e) =>
              handleResearcherChange("availability_date", e.target.value)
            }
            placeholder="Сентябрь 2025"
          />
        </label>
        <label>
          Ожидания по зарплате
          <input
            value={p.salary_expectation || ""}
            onChange={(e) =>
              handleResearcherChange("salary_expectation", e.target.value)
            }
            placeholder="По договорённости"
          />
        </label>
        <label>
          Дополнительно о поиске работы
          <textarea
            rows={3}
            value={p.job_search_notes || ""}
            onChange={(e) =>
              handleResearcherChange("job_search_notes", e.target.value)
            }
            placeholder="Дополнительная информация"
          />
        </label>

        <button className="primary-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
