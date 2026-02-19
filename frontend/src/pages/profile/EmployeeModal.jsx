import React, { useState, useEffect } from "react";
import WebsiteLink from "../../components/WebsiteLink";

export default function EmployeeModal({
  employeePreview,
  showEmployeePublications,
  setShowEmployeePublications,
  closeEmployeePreview,
}) {
  const [showEmployeeEducation, setShowEmployeeEducation] = useState(false);
  useEffect(() => {
    if (employeePreview) setShowEmployeeEducation(false);
  }, [employeePreview?.id]);
  if (!employeePreview) return null;

  return (
    <div className="gallery-overlay" onClick={closeEmployeePreview}>
      <div className="employee-modal" onClick={(e) => e.stopPropagation()}>
        <button className="gallery-close" onClick={closeEmployeePreview} aria-label="Закрыть">
          ×
        </button>
        <div className="employee-modal__header">
          {employeePreview.photo_url ? (
            <img className="employee-avatar-lg" src={employeePreview.photo_url} alt="" />
          ) : (
            <div className="employee-avatar-placeholder">
              {employeePreview.full_name ? employeePreview.full_name.charAt(0).toUpperCase() : "?"}
            </div>
          )}
          <div className="employee-modal__title-wrap">
            <div className="employee-title">{employeePreview.full_name}</div>
            {employeePreview.academic_degree && (
              <div className="employee-subtitle">{employeePreview.academic_degree}</div>
            )}
            {(employeePreview.positions || []).length > 0 && (
              <div className="employee-subtitle">{employeePreview.positions.join(", ")}</div>
            )}
          </div>
        </div>
        {(employeePreview.research_interests || []).length > 0 && (
          <div className="employee-block">
            <div className="profile-label">Научные интересы</div>
            <div className="profile-list-text">{employeePreview.research_interests.join(", ")}</div>
          </div>
        )}
        {(employeePreview.laboratories || []).length > 0 && (
          <div className="employee-block">
            <div className="profile-label">Лаборатории</div>
            <div className="chip-row">
              {employeePreview.laboratories.map((lab) => (
                <span key={lab.id} className="chip">
                  {lab.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {(employeePreview.education || []).length > 0 && (
          <div className="employee-block">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setShowEmployeeEducation((prev) => !prev)}
            >
              {showEmployeeEducation ? "Скрыть образование" : "Образование"}
              <span className="employee-collapse-badge">({employeePreview.education.length})</span>
            </button>
            {showEmployeeEducation && (
              <ul className="employee-list">
                {employeePreview.education.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="employee-block">
          <div className="profile-label">Индексы Хирша</div>
          <div className="employee-metrics">
            <span>WoS: {employeePreview.hindex_wos ?? "—"}</span>
            <span>Scopus: {employeePreview.hindex_scopus ?? "—"}</span>
            <span>РИНЦ: {employeePreview.hindex_rsci ?? "—"}</span>
            <span>OpenAlex: {employeePreview.hindex_openalex ?? "—"}</span>
          </div>
        </div>
        {employeePreview.contacts && (
          <div className="employee-block">
            <div className="profile-label">Контакты</div>
            <div className="employee-contacts">
              {employeePreview.contacts.email && <div>{employeePreview.contacts.email}</div>}
              {employeePreview.contacts.phone && <div>{employeePreview.contacts.phone}</div>}
              {employeePreview.contacts.website && (
                <WebsiteLink url={employeePreview.contacts.website} className="file-link" />
              )}
              {employeePreview.contacts.telegram && <div>{employeePreview.contacts.telegram}</div>}
            </div>
          </div>
        )}
        {(employeePreview.publications || []).length > 0 && (
          <div className="employee-block">
            <button className="ghost-btn" onClick={() => setShowEmployeePublications((prev) => !prev)}>
              {showEmployeePublications ? "Скрыть публикации" : "Публикации"}
              <span className="employee-collapse-badge">({employeePreview.publications.length})</span>
            </button>
            {showEmployeePublications && (
              <ul className="employee-list">
                {employeePreview.publications.map((pub, index) => (
                  <li key={`pub-${index}`}>
                    {pub.link ? (
                      <a href={pub.link} target="_blank" rel="noreferrer" className="employee-pub-link">
                        {pub.title || "Ссылка"}
                      </a>
                    ) : (
                      <div>{pub.title}</div>
                    )}
                    {pub.source && <div className="profile-list-text">{pub.source}</div>}
                    {pub.notes && <div className="profile-list-text">{pub.notes}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
