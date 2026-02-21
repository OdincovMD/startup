import React, { useRef, useState } from "react";
import { normalizeWebsiteInput } from "../../utils/validation";

const fileNameFromUrl = (url) => {
  try {
    const withoutQuery = url.split("?")[0];
    const parts = withoutQuery.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "документ");
  } catch {
    return "документ";
  }
};

function TagInput({ value = [], onChange, placeholder, id }) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim().replace(/,+$/, "").trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag();
    }
  };

  const removeTag = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="tag-input-container">
      <div className="tag-input-tags">
        {value.map((tag, index) => (
          <span key={`${tag}-${index}`} className="tag-input-tag">
            {tag}
            <button
              type="button"
              className="tag-input-tag-remove"
              onClick={() => removeTag(index)}
              aria-label={`Удалить ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ""}
          className="tag-input-field"
        />
      </div>
    </div>
  );
}

const JOB_SEARCH_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "active", label: "Активно ищу работу" },
  { value: "passive", label: "Рассматриваю предложения" },
  { value: "not_active", label: "Не ищу работу" },
];

export default function ResearcherProfileSection({
  hideTitle = false,
  researcherProfile,
  handleResearcherChange,
  saveResearcher,
  uploadResearcherResume,
  uploadResearcherDocument,
  removeResearcherDocument,
  saving,
  uploading,
  onFileInputRefsReady,
}) {
  const educationInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const [educationExpanded, setEducationExpanded] = useState(false);
  const [publicationsExpanded, setPublicationsExpanded] = useState(false);

  React.useEffect(() => {
    onFileInputRefsReady?.([resumeInputRef, documentInputRef]);
  }, [onFileInputRefsReady]);

  const p = researcherProfile || {};

  const handleSave = () => {
    saveResearcher();
  };

  return (
    <div className="profile-section profile-section--no-border">
      {!hideTitle && <h3 className="profile-section-title">Профиль исследователя</h3>}
      <p className="profile-section-desc">Научная деятельность и поиск работы</p>

      <div className="profile-form profile-form--grouped">
        <div className="profile-form-group">
          <div className="profile-form-group-title">Научная деятельность</div>
          <label>
            Учёная степень / звание
            <input
              value={p.academic_degree || ""}
              onChange={(e) => handleResearcherChange("academic_degree", e.target.value)}
              placeholder="Доктор химических наук, профессор"
            />
          </label>
          <label>
            Должность
            <input
              value={p.position || ""}
              onChange={(e) => handleResearcherChange("position", e.target.value)}
              placeholder="Ведущий научный сотрудник, постдок"
            />
          </label>
          <label htmlFor="researcher-interests">
            Научные интересы
            <TagInput
              id="researcher-interests"
              value={p.research_interests || []}
              onChange={(interests) => handleResearcherChange("research_interests", interests)}
              placeholder="Введите интерес и нажмите запятую или Enter"
            />
            <span className="profile-field-hint">Материаловедение, наноэнзимы и т.д.</span>
          </label>
        </div>

        <div className="profile-form-group">
          <button
            type="button"
            className="collapsible-header"
            onClick={() => setEducationExpanded(!educationExpanded)}
            aria-expanded={educationExpanded}
          >
            <span>Образование ({(p.education || []).length})</span>
            <span className={`collapsible-arrow ${educationExpanded ? "expanded" : ""}`}>▼</span>
          </button>
          {educationExpanded && (
            <div className="collapsible-content">
              <div className="inline-form">
                <input
                  ref={educationInputRef}
                  placeholder="Университет, факультет, специальность, год"
                  className="education-input"
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
                  type="button"
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
              <span className="profile-field-hint">Введите информацию и нажмите Enter или "Добавить"</span>
              {(p.education || []).length > 0 && (
                <div className="education-list">
                  {(p.education || []).map((item, index) => (
                    <div key={`edu-${index}`} className="education-item">
                      <span>{item}</span>
                      <button
                        type="button"
                        className="file-remove"
                        onClick={() =>
                          handleResearcherChange(
                            "education",
                            (p.education || []).filter((_, i) => i !== index)
                          )
                        }
                        aria-label="Удалить"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="profile-form-group">
          <div className="profile-form-group-title">Индексы цитирования</div>
          <div className="researcher-hindex-grid">
            <label>
              h-index WoS
              <input
                type="number"
                value={p.hindex_wos ?? ""}
                onChange={(e) =>
                  handleResearcherChange("hindex_wos", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="—"
                min="0"
              />
            </label>
            <label>
              h-index Scopus
              <input
                type="number"
                value={p.hindex_scopus ?? ""}
                onChange={(e) =>
                  handleResearcherChange("hindex_scopus", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="—"
                min="0"
              />
            </label>
            <label>
              h-index РИНЦ
              <input
                type="number"
                value={p.hindex_rsci ?? ""}
                onChange={(e) =>
                  handleResearcherChange("hindex_rsci", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="—"
                min="0"
              />
            </label>
          </div>
        </div>

        <div className="profile-form-group">
          <button
            type="button"
            className="collapsible-header"
            onClick={() => setPublicationsExpanded(!publicationsExpanded)}
            aria-expanded={publicationsExpanded}
          >
            <span>Публикации ({(p.publications || []).length})</span>
            <span className={`collapsible-arrow ${publicationsExpanded ? "expanded" : ""}`}>▼</span>
          </button>
          {publicationsExpanded && (
            <div className="collapsible-content">
              <div className="publications-actions">
                <button
                  type="button"
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
              {(p.publications || []).length === 0 && (
                <p className="profile-field-hint">Нет добавленных публикаций</p>
              )}
              {(p.publications || []).map((pub, index) => (
                <div key={`pub-${index}`} className="publication-card">
                  <div className="publication-card-fields">
                    <input
                      value={pub.title || ""}
                      onChange={(e) => {
                        const next = [...(p.publications || [])];
                        next[index] = { ...next[index], title: e.target.value };
                        handleResearcherChange("publications", next);
                      }}
                      placeholder="Название статьи"
                      className="publication-title-input"
                    />
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
                      placeholder="Ссылка (DOI, URL)"
                      className="publication-link-input"
                    />
                  </div>
                  <button
                    type="button"
                    className="publication-remove"
                    onClick={() =>
                      handleResearcherChange(
                        "publications",
                        (p.publications || []).filter((_, i) => i !== index)
                      )
                    }
                    aria-label="Удалить публикацию"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="profile-form-group">
          <div className="profile-form-group-title">Поиск работы</div>
          <div className="job-search-status-selector">
            {JOB_SEARCH_OPTIONS.map((opt) => (
              <label key={opt.value} className="job-search-option">
                <input
                  type="radio"
                  name="job_search_status"
                  value={opt.value}
                  checked={(p.job_search_status || "") === opt.value}
                  onChange={(e) => handleResearcherChange("job_search_status", e.target.value || null)}
                />
                <span className="job-search-option-label">{opt.label}</span>
              </label>
            ))}
          </div>
          <label>
            Желаемые должности
            <input
              value={p.desired_positions || ""}
              onChange={(e) => handleResearcherChange("desired_positions", e.target.value)}
              placeholder="Постдок, научный сотрудник, руководитель группы"
            />
          </label>
          <label>
            Предпочтительный тип занятости
            <input
              value={p.employment_type_preference || ""}
              onChange={(e) => handleResearcherChange("employment_type_preference", e.target.value)}
              placeholder="Полная занятость, частичная, удалённо"
            />
          </label>
          <label>
            Предпочтительный регион
            <input
              value={p.preferred_region || ""}
              onChange={(e) => handleResearcherChange("preferred_region", e.target.value)}
              placeholder="Москва, Санкт-Петербург, удалённо"
            />
          </label>
          <div className="job-search-row">
            <label>
              Дата выхода на работу
              <input
                value={p.availability_date || ""}
                onChange={(e) => handleResearcherChange("availability_date", e.target.value)}
                placeholder="Сентябрь 2025"
              />
            </label>
            <label>
              Ожидания по зарплате
              <input
                value={p.salary_expectation || ""}
                onChange={(e) => handleResearcherChange("salary_expectation", e.target.value)}
                placeholder="По договорённости"
              />
            </label>
          </div>
          <label>
            Дополнительно о поиске работы
            <textarea
              rows={3}
              value={p.job_search_notes || ""}
              onChange={(e) => handleResearcherChange("job_search_notes", e.target.value)}
              placeholder="Готов к релокации, интересуют международные проекты..."
            />
          </label>
        </div>

        <div className="profile-form-group">
          <div className="profile-form-group-title">Резюме и документы</div>
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
                type="button"
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
                type="button"
                className="file-remove"
                onClick={() => removeResearcherDocument?.(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button className="primary-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
