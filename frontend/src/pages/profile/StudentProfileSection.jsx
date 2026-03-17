import React, { useRef, useState } from "react";
import { 
  User, 
  GraduationCap, 
  Award, 
  FlaskConical, 
  FileText, 
  Upload, 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock,
  ExternalLink,
  BookOpen
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

const STUDENT_STATUS_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "Практика", label: "Практика" },
  { value: "Трудоустройство", label: "Трудоустройство" },
  { value: "Стажировка", label: "Стажировка" },
];

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
    <div className="tag-input-container-modern" style={{ background: "var(--page-bg-alt)", border: "1.5px solid var(--border)", borderRadius: "0.75rem", padding: "0.5rem", minHeight: "44px", transition: "all 0.2s" }}>
      <div className="tag-input-tags" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {value.map((tag, index) => (
          <Badge key={`${tag}-${index}`} variant="accent" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.6rem" }}>
            {tag}
            <button
              type="button"
              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: "14px", lineHeight: 1, display: "flex", alignItems: "center" }}
              onClick={() => removeTag(index)}
              aria-label={`Удалить ${tag}`}
            >
              <Trash2 size={12} />
            </button>
          </Badge>
        ))}
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ""}
          style={{ flex: 1, minWidth: "120px", background: "none", border: "none", outline: "none", padding: "0.25rem", color: "var(--text-primary)", fontSize: "0.9375rem" }}
        />
      </div>
    </div>
  );
}

export default function StudentProfileSection({
  title = "Профиль студента",
  hideTitle = false,
  studentProfile,
  handleStudentChange,
  saveStudent,
  togglePublish,
  uploadStudentResume,
  uploadStudentDocument,
  removeStudentDocument,
  saving,
  uploading,
  onFileInputRefsReady,
}) {
  const educationInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const [educationExpanded, setEducationExpanded] = useState(false);

  React.useEffect(() => {
    onFileInputRefsReady?.([resumeInputRef, documentInputRef]);
  }, [onFileInputRefsReady]);

  const p = studentProfile || {};

  const handleSave = () => {
    saveStudent();
  };

  return (
    <Card variant="solid" padding="lg" className="profile-section-card">
      <div className="profile-section-header" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          {!hideTitle && (
            <h2 className="profile-section-card__title" style={{ margin: 0, fontSize: "1.5rem" }}>{title}</h2>
          )}
          <p className="profile-section-desc" style={{ marginTop: "0.5rem" }}>
            Укажите информацию о поиске работы, образовании и компетенциях.
          </p>
        </div>
        <Badge variant={p.is_published ? "success" : "draft"} style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {p.is_published ? <CheckCircle2 size={14} /> : <Clock size={14} />}
            {p.is_published ? "Опубликовано" : "Черновик"}
          </div>
        </Badge>
      </div>

      <div className="profile-form profile-form--grouped" style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        
        {/* Basic Info & Status */}
        <div className="profile-form-group">
          <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <User size={20} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Основная информация
            </span>
          </div>
          
          <div className="status-selector-container" style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              Статус поиска работы
            </label>
            <div className="job-search-status-selector-modern" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {STUDENT_STATUS_OPTIONS.map((opt) => {
                const isSelected = (p.status || "") === opt.value;
                return (
                  <label key={opt.value || "empty"} className="job-search-option-modern" style={{ cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="student_status"
                      value={opt.value}
                      checked={isSelected}
                      onChange={(e) => handleStudentChange("status", e.target.value || null)}
                      style={{ display: "none" }}
                    />
                    <div style={{ 
                      padding: "0.6rem 1.25rem", 
                      borderRadius: "99px", 
                      border: "1.5px solid", 
                      borderColor: isSelected ? "var(--accent)" : "var(--border)", 
                      background: isSelected ? "var(--accent-bg)" : "var(--page-bg)",
                      color: isSelected ? "var(--accent)" : "var(--text-secondary)",
                      fontSize: "0.9375rem",
                      fontWeight: isSelected ? 600 : 500,
                      transition: "all 0.2s"
                    }}>
                      {opt.label}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="ui-input-group">
            <label htmlFor="student-summary" style={{ fontWeight: 600 }}>О себе</label>
            <textarea
              id="student-summary"
              rows={4}
              className="ui-input"
              value={p.summary || ""}
              onChange={(e) => handleStudentChange("summary", e.target.value)}
              placeholder="Расскажите о себе, опыте работы (если имеется), своих целях и интересах"
              style={{ padding: "1rem" }}
            />
          </div>
        </div>

        {/* Education */}
        <div className="profile-form-group">
          <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <GraduationCap size={20} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Образование
            </span>
          </div>
          
          <div className="education-collapsible-modern" style={{ border: "1px solid var(--border-light)", borderRadius: "12px", overflow: "hidden" }}>
            <button
              type="button"
              className="collapsible-header-modern"
              onClick={() => setEducationExpanded(!educationExpanded)}
              aria-expanded={educationExpanded}
              style={{ width: "100%", padding: "1rem 1.25rem", background: "var(--nav-active-bg)", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  Записи об образовании ({(p.education || []).length})
                </span>
              </div>
              {educationExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
            </button>
            
            {educationExpanded && (
              <div className="collapsible-content-modern" style={{ padding: "1.25rem", background: "var(--page-bg)" }}>
                <div className="education-form-inline" style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <input
                    ref={educationInputRef}
                    placeholder="Университет, факультет, год выпуска..."
                    className="ui-input"
                    style={{ flex: 1, padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const v = e.currentTarget.value.trim();
                        if (v) {
                          handleStudentChange("education", [...(p.education || []), v]);
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => {
                      const v = educationInputRef.current?.value?.trim();
                      if (v) {
                        handleStudentChange("education", [...(p.education || []), v]);
                        educationInputRef.current.value = "";
                      }
                    }}
                    style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
                  >
                    <Plus size={14} style={{ marginRight: "4px" }} /> Добавить
                  </Button>
                </div>
                <p className="profile-field-hint" style={{ fontSize: "0.75rem", marginBottom: "1.25rem" }}>
                  Нажмите Enter или кнопку «Добавить», чтобы сохранить запись
                </p>

                {(p.education || []).length > 0 ? (
                  <div className="education-items-list" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {(p.education || []).map((item, index) => (
                      <div key={`edu-${index}`} className="education-item-modern" style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.75rem", background: "var(--page-bg-alt)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent-bg)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <BookOpen size={16} />
                        </div>
                        <span style={{ flex: 1, fontSize: "0.875rem", color: "var(--text-primary-alt)", lineHeight: 1.4, paddingTop: "4px" }}>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleStudentChange("education", (p.education || []).filter((_, i) => i !== index))}
                          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                          aria-label="Удалить"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)", fontSize: "0.875rem", border: "1px dashed var(--border)", borderRadius: "8px" }}>
                    Список пуст
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Competencies */}
        <div className="profile-form-group">
          <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <Award size={20} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Компетенции и интересы
            </span>
          </div>

          <div className="competencies-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            <div className="ui-input-group">
              <label htmlFor="skills-input" style={{ fontWeight: 600 }}>Навыки</label>
              <TagInput
                id="skills-input"
                value={p.skills || []}
                onChange={(skills) => handleStudentChange("skills", skills)}
                placeholder="Python, SQL, дизайн..."
              />
              <span className="profile-field-hint">Введите название и нажмите Enter</span>
            </div>
            
            <div className="ui-input-group">
              <label htmlFor="interests-input" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
                <FlaskConical size={14} color="var(--accent)" /> Научные интересы
              </label>
              <TagInput
                id="interests-input"
                value={p.research_interests || []}
                onChange={(interests) => handleStudentChange("research_interests", interests)}
                placeholder="Биоинформатика, физика..."
              />
              <span className="profile-field-hint">Ключевые слова ваших интересов</span>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="profile-form-group">
          <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <FileText size={20} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Резюме и документы
            </span>
          </div>

          <div className="documents-upload-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
            {/* Resume */}
            <div className="upload-box-modern">
              <label htmlFor="student-resume" style={{ display: "block", marginBottom: "0.75rem", fontWeight: 600, fontSize: "0.875rem" }}>
                Резюме / CV
              </label>
              <div className="file-input-wrapper-modern" style={{ position: "relative" }}>
                <input
                  ref={resumeInputRef}
                  id="student-resume"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => uploadStudentResume?.(e.target.files?.[0])}
                  disabled={uploading || saving}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", zIndex: 2 }}
                />
                <div style={{ padding: "0.75rem 1rem", border: "2px dashed var(--border)", borderRadius: "12px", background: "var(--nav-active-bg)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>
                  <Upload size={18} />
                  {uploading ? "Загрузка..." : "Загрузить PDF или DOCX"}
                </div>
              </div>
              
              {p.resume_url && (
                <div className="file-pill-modern" style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "var(--accent-bg)", borderRadius: "10px", border: "1px solid var(--accent-soft)" }}>
                  <FileText size={16} color="var(--accent)" />
                  <a href={p.resume_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: "0.8125rem", color: "var(--accent)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {fileNameFromUrl(p.resume_url)}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleStudentChange("resume_url", "")}
                    style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: "2px" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Other Docs */}
            <div className="upload-box-modern">
              <label htmlFor="student-docs" style={{ display: "block", marginBottom: "0.75rem", fontWeight: 600, fontSize: "0.875rem" }}>
                Дополнительные документы
              </label>
              <div className="file-input-wrapper-modern" style={{ position: "relative" }}>
                <input
                  ref={documentInputRef}
                  id="student-docs"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={(e) => uploadStudentDocument?.(e.target.files?.[0])}
                  disabled={uploading || saving}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", zIndex: 2 }}
                />
                <div style={{ padding: "0.75rem 1rem", border: "2px dashed var(--border)", borderRadius: "12px", background: "var(--nav-active-bg)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>
                  <Plus size={18} />
                  {uploading ? "Загрузка..." : "Добавить сертификат"}
                </div>
              </div>

              {(p.document_urls || []).length > 0 && (
                <div className="docs-list-modern" style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {(p.document_urls || []).map((url, index) => (
                    <div key={`doc-${index}`} className="file-pill-modern" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.8rem", background: "var(--page-bg-alt)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                      <FileText size={14} color="var(--text-muted)" />
                      <a href={url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: "0.75rem", color: "var(--text-primary-alt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {fileNameFromUrl(url)}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeStudentDocument?.(index)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="profile-actions-wrap-modern" style={{ display: "flex", gap: "1rem", borderTop: "1px solid var(--border-light)", paddingTop: "2rem", marginTop: "1rem" }}>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving} style={{ padding: "0.75rem 2.5rem" }}>
            {saving ? "Сохранение..." : "Сохранить профиль"}
          </Button>
          {togglePublish && (
            <Button
              variant={p.is_published ? "secondary" : "ghost"}
              onClick={() => togglePublish()}
              disabled={saving}
              style={{ padding: "0.75rem 1.5rem" }}
            >
              {p.is_published ? "Снять с публикации" : "Опубликовать"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
