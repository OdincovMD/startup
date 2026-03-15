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
  BookOpen,
  Briefcase,
  Trophy,
  BarChart3,
  Link as LinkIcon
} from "lucide-react";
import { normalizeWebsiteInput } from "../../utils/validation";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

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
    <div className="tag-input-container-modern" style={{ background: "var(--page-bg-alt)", border: "1.5px solid var(--border)", borderRadius: "0.75rem", padding: "0.5rem", minHeight: "44px" }}>
      <div className="tag-input-tags" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {value.map((tag, index) => (
          <Badge key={`${tag}-${index}`} variant="accent" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.6rem" }}>
            {tag}
            <button
              type="button"
              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
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
  togglePublish,
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
    <Card variant="solid" padding="lg" className="profile-section-card">
      <div className="profile-section-header" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          {!hideTitle && (
            <h2 className="profile-section-card__title" style={{ margin: 0, fontSize: "1.5rem" }}>Профиль исследователя</h2>
          )}
          <p className="profile-section-desc" style={{ marginTop: "0.5rem" }}>
            Научная деятельность, публикации и предпочтения по работе.
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
        
        {/* Scientific Activity */}
        <div className="profile-form-group">
          <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
            <FlaskConical size={20} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Научная деятельность
            </span>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <Input
              id="researcher-academic_degree"
              label="Учёная степень / звание"
              value={p.academic_degree || ""}
              onChange={(e) => handleResearcherChange("academic_degree", e.target.value)}
              placeholder="Доктор химических наук, профессор"
            />
            <Input
              id="researcher-position"
              label="Текущая должность"
              value={p.position || ""}
              onChange={(e) => handleResearcherChange("position", e.target.value)}
              placeholder="Ведущий научный сотрудник, постдок"
            />
          </div>

          <div className="ui-input-group">
            <label htmlFor="researcher-interests" style={{ fontWeight: 600 }}>Научные интересы</label>
            <TagInput
              id="researcher-interests"
              value={p.research_interests || []}
              onChange={(interests) => handleResearcherChange("research_interests", interests)}
              placeholder="Материаловедение, наноэнзимы..."
            />
            <span className="profile-field-hint">Введите ключевые слова и нажмите Enter</span>
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
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                Записи об образовании ({(p.education || []).length})
              </span>
              {educationExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
            </button>
            
            {educationExpanded && (
              <div className="collapsible-content-modern" style={{ padding: "1.25rem", background: "var(--page-bg)" }}>
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <input
                    ref={educationInputRef}
                    placeholder="Университет, специальность, год..."
                    className="ui-input"
                    style={{ flex: 1, padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
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
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => {
                      const v = educationInputRef.current?.value?.trim();
                      if (v) {
                        handleResearcherChange("education", [...(p.education || []), v]);
                        educationInputRef.current.value = "";
                      }
                    }}
                  >
                    Добавить
                  </Button>
                </div>

                <div className="education-items-list" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {(p.education || []).map((item, index) => (
                    <div key={`edu-${index}`} className="education-item-modern" style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.75rem", background: "var(--page-bg-alt)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent-bg)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <BookOpen size={16} />
                      </div>
                      <span style={{ flex: 1, fontSize: "0.875rem", color: "var(--text-primary-alt)", lineHeight: 1.4, paddingTop: "4px" }}>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleResearcherChange("education", (p.education || []).filter((_, i) => i !== index))}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {(p.education || []).length === 0 && (
                    <div style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>Список пуст</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Citation Indices */}
        <div className="profile-form-group">
          <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <BarChart3 size={20} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Индексы цитирования (h-index)
            </span>
          </div>
          
          <div className="hindex-grid-modern" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <div style={{ background: "var(--nav-active-bg)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
              <Input
                id="hindex_wos"
                label="Web of Science"
                type="number"
                value={p.hindex_wos ?? ""}
                onChange={(e) => handleResearcherChange("hindex_wos", e.target.value ? Number(e.target.value) : null)}
                placeholder="—"
                style={{ border: "none", background: "#fff", marginTop: "0.5rem" }}
              />
            </div>
            <div style={{ background: "var(--nav-active-bg)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
              <Input
                id="hindex_scopus"
                label="Scopus"
                type="number"
                value={p.hindex_scopus ?? ""}
                onChange={(e) => handleResearcherChange("hindex_scopus", e.target.value ? Number(e.target.value) : null)}
                placeholder="—"
                style={{ border: "none", background: "#fff", marginTop: "0.5rem" }}
              />
            </div>
            <div style={{ background: "var(--nav-active-bg)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
              <Input
                id="hindex_rsci"
                label="РИНЦ"
                type="number"
                value={p.hindex_rsci ?? ""}
                onChange={(e) => handleResearcherChange("hindex_rsci", e.target.value ? Number(e.target.value) : null)}
                placeholder="—"
                style={{ border: "none", background: "#fff", marginTop: "0.5rem" }}
              />
            </div>
          </div>
        </div>

        {/* Publications */}
        <div className="profile-form-group">
          <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <Trophy size={20} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Публикации
            </span>
          </div>
          
          <div className="publications-collapsible-modern" style={{ border: "1px solid var(--border-light)", borderRadius: "12px", overflow: "hidden" }}>
            <button
              type="button"
              className="collapsible-header-modern"
              onClick={() => setPublicationsExpanded(!publicationsExpanded)}
              aria-expanded={publicationsExpanded}
              style={{ width: "100%", padding: "1rem 1.25rem", background: "var(--nav-active-bg)", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            >
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                Список публикаций ({(p.publications || []).length})
              </span>
              {publicationsExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
            </button>
            
            {publicationsExpanded && (
              <div className="collapsible-content-modern" style={{ padding: "1.25rem", background: "var(--page-bg)" }}>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => handleResearcherChange("publications", [...(p.publications || []), { title: "", link: "", source: "", notes: "" }])}
                  style={{ marginBottom: "1.5rem", width: "100%", border: "1px dashed var(--border)", borderRadius: "8px" }}
                >
                  <Plus size={16} style={{ marginRight: "4px" }} /> Добавить статью
                </Button>

                <div className="publications-list-grid" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {(p.publications || []).map((pub, index) => (
                    <Card key={`pub-${index}`} variant="glass" padding="md" style={{ border: "1px solid var(--border-light)", background: "var(--page-bg-alt)" }}>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          <input
                            value={pub.title || ""}
                            onChange={(e) => {
                              const next = [...(p.publications || [])];
                              next[index] = { ...next[index], title: e.target.value };
                              handleResearcherChange("publications", next);
                            }}
                            placeholder="Название статьи"
                            className="ui-input"
                            style={{ padding: "0.5rem 0.75rem", fontSize: "0.9375rem", fontWeight: 600 }}
                          />
                          <div style={{ position: "relative" }}>
                            <LinkIcon size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
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
                              className="ui-input"
                              style={{ padding: "0.5rem 0.75rem 0.5rem 2.25rem", fontSize: "0.8125rem" }}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleResearcherChange("publications", (p.publications || []).filter((_, i) => i !== index))}
                          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Job Search */}
        <div className="profile-form-group">
          <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
            <Briefcase size={20} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Поиск работы
            </span>
          </div>

          <div className="status-selector-container" style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              Ваш статус
            </label>
            <div className="job-search-status-selector-modern" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {JOB_SEARCH_OPTIONS.map((opt) => {
                const isSelected = (p.job_search_status || "") === opt.value;
                return (
                  <label key={opt.value} className="job-search-option-modern" style={{ cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="job_search_status"
                      value={opt.value}
                      checked={isSelected}
                      onChange={(e) => handleResearcherChange("job_search_status", e.target.value || null)}
                      style={{ display: "none" }}
                    />
                    <div style={{ 
                      padding: "0.6rem 1.25rem", 
                      borderRadius: "99px", 
                      border: "1.5px solid", 
                      borderColor: isSelected ? "var(--accent)" : "var(--border)", 
                      background: isSelected ? "var(--accent-bg)" : "var(--page-bg)",
                      color: isSelected ? "var(--accent)" : "var(--text-secondary)",
                      fontSize: "0.875rem",
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <Input
              id="researcher-desired_positions"
              label="Желаемые должности"
              value={p.desired_positions || ""}
              onChange={(e) => handleResearcherChange("desired_positions", e.target.value)}
              placeholder="Постдок, научный сотрудник..."
            />
            <Input
              id="researcher-employment_type"
              label="Тип занятости"
              value={p.employment_type_preference || ""}
              onChange={(e) => handleResearcherChange("employment_type_preference", e.target.value)}
              placeholder="Полная занятость, удалённо..."
            />
            <Input
              id="researcher-preferred_region"
              label="Предпочтительный регион"
              value={p.preferred_region || ""}
              onChange={(e) => handleResearcherChange("preferred_region", e.target.value)}
              placeholder="Москва, удалённо..."
            />
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <Input
                  id="researcher-availability_date"
                  label="Дата выхода"
                  value={p.availability_date || ""}
                  onChange={(e) => handleResearcherChange("availability_date", e.target.value)}
                  placeholder="Сентябрь 2025"
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  id="researcher-salary_expectation"
                  label="Ожидания по з/п"
                  value={p.salary_expectation || ""}
                  onChange={(e) => handleResearcherChange("salary_expectation", e.target.value)}
                  placeholder="По договорённости"
                />
              </div>
            </div>
          </div>
          
          <div className="ui-input-group">
            <label htmlFor="researcher-job_search_notes" style={{ fontWeight: 600 }}>Дополнительно о поиске</label>
            <textarea
              id="researcher-job_search_notes"
              rows={3}
              className="ui-input"
              value={p.job_search_notes || ""}
              onChange={(e) => handleResearcherChange("job_search_notes", e.target.value)}
              placeholder="Готов к релокации, интересуют международные проекты..."
              style={{ padding: "0.75rem 1rem" }}
            />
          </div>
        </div>

        {/* Documents */}
        <div className="profile-form-group">
          <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
            <FileText size={20} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Резюме и документы
            </span>
          </div>

          <div className="documents-upload-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
            <div className="upload-box-modern">
              <label htmlFor="researcher-resume" style={{ display: "block", marginBottom: "0.75rem", fontWeight: 600, fontSize: "0.875rem" }}>
                Резюме / CV
              </label>
              <div className="file-input-wrapper-modern" style={{ position: "relative" }}>
                <input
                  ref={resumeInputRef}
                  id="researcher-resume"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => uploadResearcherResume?.(e.target.files?.[0])}
                  disabled={uploading || saving}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", zIndex: 2 }}
                />
                <div style={{ padding: "1rem", border: "2px dashed var(--border)", borderRadius: "12px", background: "var(--nav-active-bg)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
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
                  <button type="button" onClick={() => handleResearcherChange("resume_url", "")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="upload-box-modern">
              <label htmlFor="researcher-docs" style={{ display: "block", marginBottom: "0.75rem", fontWeight: 600, fontSize: "0.875rem" }}>
                Дополнительные документы
              </label>
              <div className="file-input-wrapper-modern" style={{ position: "relative" }}>
                <input
                  ref={documentInputRef}
                  id="researcher-docs"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={(e) => uploadResearcherDocument?.(e.target.files?.[0])}
                  disabled={uploading || saving}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", zIndex: 2 }}
                />
                <div style={{ padding: "1rem", border: "2px dashed var(--border)", borderRadius: "12px", background: "var(--nav-active-bg)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <Plus size={18} />
                  {uploading ? "Загрузка..." : "Добавить файл"}
                </div>
              </div>

              {(p.document_urls || []).length > 0 && (
                <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {(p.document_urls || []).map((url, index) => (
                    <div key={`doc-${index}`} className="file-pill-modern" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.8rem", background: "var(--page-bg-alt)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                      <FileText size={14} color="var(--text-muted)" />
                      <a href={url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: "0.75rem", color: "var(--text-primary-alt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {fileNameFromUrl(url)}
                      </a>
                      <button type="button" onClick={() => removeResearcherDocument?.(index)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
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
