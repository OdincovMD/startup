import React, { useState, useEffect } from "react";
import { 
  X, 
  GraduationCap, 
  Beaker, 
  TrendingUp, 
  Mail, 
  Phone, 
  Globe, 
  Send, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen
} from "lucide-react";
import WebsiteLink from "../../components/WebsiteLink";
import { Badge, EntityAvatar } from "../../components/ui";

export default function EmployeeModal({
  employeePreview,
  showEmployeePublications,
  setShowEmployeePublications,
  closeEmployeePreview,
}) {
  const [showEmployeeEducation, setShowEmployeeEducation] = useState(false);
  
  useEffect(() => {
    if (employeePreview) {
      setShowEmployeeEducation(false);
    }
  }, [employeePreview?.id]);

  if (!employeePreview) return null;

  const interests = employeePreview.research_interests || [];
  const labs = employeePreview.laboratories || [];
  const education = employeePreview.education || [];
  const publications = employeePreview.publications || [];
  const contacts = employeePreview.contacts || {};
  
  const hirschData = [
    { label: "WoS", value: employeePreview.hindex_wos },
    { label: "Scopus", value: employeePreview.hindex_scopus },
    { label: "РИНЦ", value: employeePreview.hindex_rsci },
    { label: "OpenAlex", value: employeePreview.hindex_openalex },
  ].filter(item => item.value != null);

  const subtitle = [
    employeePreview.academic_degree, 
    (employeePreview.positions || []).join(", ")
  ].filter(Boolean).join(" · ");

  return (
    <div className="gallery-overlay" onClick={closeEmployeePreview}>
      <div className="employee-modal employee-modal--refined" onClick={(e) => e.stopPropagation()}>
        <button className="employee-modal__close" onClick={closeEmployeePreview} aria-label="Закрыть">
          <X size={20} />
        </button>

        <div className="employee-modal__header">
          <div className="employee-modal__avatar-section">
            <div className="employee-modal__avatar-container">
              <EntityAvatar
                src={employeePreview.photo_url}
                alt={employeePreview.full_name}
                className="employee-modal__avatar"
              />
            </div>
            <div className="employee-modal__title-group">
              <h2 className="employee-modal__name">{employeePreview.full_name}</h2>
              {subtitle && <p className="employee-modal__subtitle">{subtitle}</p>}
            </div>
          </div>
        </div>

        <div className="employee-modal__scroll-area">
          {interests.length > 0 && (
            <div className="employee-modal__section">
              <div className="employee-modal__section-header">
                <BookOpen size={16} />
                <span>Научные интересы</span>
              </div>
              <div className="employee-modal__badges">
                {interests.map((interest) => (
                  <Badge key={interest} variant="default" className="employee-modal__badge">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {labs.length > 0 && (
            <div className="employee-modal__section">
              <div className="employee-modal__section-header">
                <Beaker size={16} />
                <span>Лаборатории</span>
              </div>
              <div className="employee-modal__badges">
                {labs.map((lab) => (
                  <Badge key={lab.id} variant="default" className="employee-modal__badge">
                    {lab.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="employee-modal__section">
              <button
                type="button"
                className="employee-modal__toggle-btn"
                onClick={() => setShowEmployeeEducation((prev) => !prev)}
              >
                <div className="employee-modal__section-header">
                  <GraduationCap size={16} />
                  <span>Образование ({education.length})</span>
                </div>
                {showEmployeeEducation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showEmployeeEducation && (
                <ul className="employee-modal__data-list">
                  {education.map((item, index) => (
                    <li key={index} className="employee-modal__list-item">{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {hirschData.length > 0 && (
            <div className="employee-modal__section">
              <div className="employee-modal__section-header">
                <TrendingUp size={16} />
                <span>Индексы Хирша</span>
              </div>
              <div className="employee-modal__hirsch-grid">
                {hirschData.map((item) => (
                  <div key={item.label} className="employee-modal__hirsch-card">
                    <span className="employee-modal__hirsch-label">{item.label}</span>
                    <span className="employee-modal__hirsch-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="employee-modal__section">
            <button
              type="button"
              className="employee-modal__toggle-btn"
              onClick={() => setShowEmployeePublications((prev) => !prev)}
            >
              <div className="employee-modal__section-header">
                <BookOpen size={16} />
                <span>Публикации ({publications.length})</span>
              </div>
              {showEmployeePublications ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showEmployeePublications && (
              <div className="employee-modal__publications">
                {publications.length > 0 ? (
                  <ul className="employee-modal__data-list">
                    {publications.map((pub, index) => (
                      <li key={index} className="employee-modal__publication-item">
                        {pub.link ? (
                          <a 
                            href={pub.link} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="employee-modal__pub-link"
                          >
                            <span className="employee-modal__pub-title">{pub.title || pub.link}</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="employee-modal__pub-title">{pub.title}</span>
                        )}
                        {pub.source && <div className="employee-modal__pub-meta">{pub.source}</div>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="employee-modal__empty">Нет данных о публикациях</p>
                )}
              </div>
            )}
          </div>

          {(contacts.email || contacts.phone || contacts.website || contacts.telegram) && (
            <div className="employee-modal__section">
              <div className="employee-modal__section-header">
                <Phone size={16} />
                <span>Контакты</span>
              </div>
              <div className="employee-modal__contacts-grid">
                {contacts.email && (
                  <a href={`mailto:${contacts.email}`} className="employee-modal__contact-item">
                    <Mail size={14} /> {contacts.email}
                  </a>
                )}
                {contacts.phone && (
                  <a href={`tel:${contacts.phone}`} className="employee-modal__contact-item">
                    <Phone size={14} /> {contacts.phone}
                  </a>
                )}
                {contacts.telegram && (
                  <a 
                    href={`https://t.me/${contacts.telegram.replace("@", "")}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="employee-modal__contact-item"
                  >
                    <Send size={14} /> {contacts.telegram}
                  </a>
                )}
                {contacts.website && (
                  <div className="employee-modal__contact-item">
                    <Globe size={14} />
                    <WebsiteLink url={contacts.website} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
