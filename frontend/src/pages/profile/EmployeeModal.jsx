import React, { useState, useEffect } from "react";
import WebsiteLink from "../../components/WebsiteLink";
import { Badge } from "../../components/ui";

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

  const interests = employeePreview.research_interests || [];
  const hasHirsch =
    employeePreview.hindex_wos != null ||
    employeePreview.hindex_scopus != null ||
    employeePreview.hindex_rsci != null ||
    employeePreview.hindex_openalex != null;

  return (
    <div className="gallery-overlay" onClick={closeEmployeePreview}>
      <div className="employee-modal employee-modal--modern" onClick={(e) => e.stopPropagation()}>
        <button className="gallery-close" onClick={closeEmployeePreview} aria-label="Закрыть">
          ×
        </button>

        <div className="employee-modal__hero">
          <div className="employee-modal__avatar-wrap">
            {employeePreview.photo_url ? (
              <img
                className="employee-modal__avatar"
                src={employeePreview.photo_url}
                alt=""
              />
            ) : (
              <div className="employee-modal__avatar-fallback">
                {employeePreview.full_name
                  ? employeePreview.full_name.charAt(0).toUpperCase()
                  : "?"}
              </div>
            )}
          </div>
          <h2 className="employee-modal__name">{employeePreview.full_name}</h2>
          {(employeePreview.academic_degree || (employeePreview.positions || []).length > 0) && (
            <div className="employee-modal__subtitle">
              {[employeePreview.academic_degree, (employeePreview.positions || []).join(", ")]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </div>

        {interests.length > 0 && (
          <div className="employee-modal__block">
            <div className="employee-modal__block-label">Научные интересы</div>
            <div className="employee-modal__badges">
              {interests.map((interest) => (
                <Badge key={interest} variant="default">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {(employeePreview.laboratories || []).length > 0 && (
          <div className="employee-modal__block">
            <div className="employee-modal__block-label">Лаборатории</div>
            <div className="employee-modal__badges">
              {employeePreview.laboratories.map((lab) => (
                <Badge key={lab.id} variant="default">
                  {lab.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {(employeePreview.education || []).length > 0 && (
          <div className="employee-modal__block">
            <button
              type="button"
              className="employee-modal__toggle"
              onClick={() => setShowEmployeeEducation((prev) => !prev)}
            >
              {showEmployeeEducation ? "Скрыть образование" : "Образование"}
              <span className="employee-modal__toggle-badge">
                ({employeePreview.education.length})
              </span>
            </button>
            {showEmployeeEducation && (
              <ul className="employee-modal__list">
                {employeePreview.education.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {hasHirsch && (
          <div className="employee-modal__block">
            <div className="employee-modal__block-label">Индексы Хирша</div>
            <div className="employee-modal__hirsch-grid">
              <div className="employee-modal__hirsch-item">
                <span className="employee-modal__hirsch-label">WoS</span>
                <span className="employee-modal__hirsch-value">
                  {employeePreview.hindex_wos ?? "—"}
                </span>
              </div>
              <div className="employee-modal__hirsch-item">
                <span className="employee-modal__hirsch-label">Scopus</span>
                <span className="employee-modal__hirsch-value">
                  {employeePreview.hindex_scopus ?? "—"}
                </span>
              </div>
              <div className="employee-modal__hirsch-item">
                <span className="employee-modal__hirsch-label">РИНЦ</span>
                <span className="employee-modal__hirsch-value">
                  {employeePreview.hindex_rsci ?? "—"}
                </span>
              </div>
              <div className="employee-modal__hirsch-item">
                <span className="employee-modal__hirsch-label">OpenAlex</span>
                <span className="employee-modal__hirsch-value">
                  {employeePreview.hindex_openalex ?? "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        {employeePreview.contacts && (
          <div className="employee-modal__block">
            <div className="employee-modal__block-label">Контакты</div>
            <div className="employee-modal__contacts">
              {employeePreview.contacts.email && (
                <div>
                  <a href={`mailto:${employeePreview.contacts.email}`}>
                    {employeePreview.contacts.email}
                  </a>
                </div>
              )}
              {employeePreview.contacts.phone && (
                <div>{employeePreview.contacts.phone}</div>
              )}
              {employeePreview.contacts.website && (
                <WebsiteLink
                  url={employeePreview.contacts.website}
                  className="employee-modal__link"
                />
              )}
              {employeePreview.contacts.telegram && (
                <div>{employeePreview.contacts.telegram}</div>
              )}
            </div>
          </div>
        )}

        {(employeePreview.publications || []).length > 0 && (
          <div className="employee-modal__block">
            <button
              type="button"
              className="employee-modal__toggle"
              onClick={() => setShowEmployeePublications((prev) => !prev)}
            >
              {showEmployeePublications ? "Скрыть публикации" : "Публикации"}
              <span className="employee-modal__toggle-badge">
                ({employeePreview.publications.length})
              </span>
            </button>
            {showEmployeePublications && (
              <ul className="employee-modal__list employee-modal__list--pubs">
                {employeePreview.publications.map((pub, index) => (
                  <li key={`pub-${index}`}>
                    {pub.link ? (
                      <a
                        href={pub.link}
                        target="_blank"
                        rel="noreferrer"
                        className="employee-modal__pub-link"
                      >
                        {pub.title || "Ссылка"}
                      </a>
                    ) : (
                      <div>{pub.title}</div>
                    )}
                    {pub.source && (
                      <div className="employee-modal__pub-meta">{pub.source}</div>
                    )}
                    {pub.notes && (
                      <div className="employee-modal__pub-meta">{pub.notes}</div>
                    )}
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
