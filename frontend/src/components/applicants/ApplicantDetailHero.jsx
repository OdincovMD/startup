import React from "react";

const ROLE_LABELS = { student: "Студент", researcher: "Исследователь" };

export default function ApplicantDetailHero({ details }) {
  const roleLabel = ROLE_LABELS[details.role] || details.role;
  const contacts = details.contacts || {};

  return (
    <div className="org-detail-hero applicant-detail-hero">
      <div className="org-detail-hero__media">
        {details.photo_url ? (
          <img className="org-detail-hero__avatar" src={details.photo_url} alt="" />
        ) : (
          <div className="org-detail-hero__avatar-placeholder applicant-detail-hero__avatar-placeholder">
            {details.full_name ? details.full_name.charAt(0).toUpperCase() : "?"}
          </div>
        )}
      </div>
      <div className="org-detail-hero__body applicant-detail-hero__body">
        <h1 className="org-detail-hero__title">{details.full_name || "Соискатель"}</h1>
        <div className="applicant-detail-hero__meta">
          <span className="applicant-detail-hero__role-chip">{roleLabel}</span>
          {details.resume_url && (
            <a
              href={details.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="applicant-detail-hero__cta"
            >
              Скачать резюме
              <span className="applicant-detail-hero__cta-arrow" aria-hidden="true">
                →
              </span>
            </a>
          )}
        </div>
        <div className="applicant-detail-hero__contacts">
          {details.mail && (
            <a href={`mailto:${details.mail}`} className="applicant-detail-hero__contact">
              {details.mail}
            </a>
          )}
          {contacts.phone && (
            <a href={`tel:${contacts.phone}`} className="applicant-detail-hero__contact">
              {contacts.phone}
            </a>
          )}
          {contacts.telegram && (
            <a
              href={`https://t.me/${contacts.telegram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="applicant-detail-hero__contact"
            >
              {contacts.telegram}
            </a>
          )}
          {!details.mail && !contacts.phone && !contacts.telegram && (
            <span className="profile-field-hint">Контакты не указаны</span>
          )}
        </div>
      </div>
    </div>
  );
}
