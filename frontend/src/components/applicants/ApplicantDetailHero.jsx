import React from "react";
import { User, GraduationCap, Briefcase, Mail, Phone, Send, FileDown } from "lucide-react";
import { EntityAvatar } from "../ui";

const ROLE_LABELS = { student: "Студент", researcher: "Исследователь" };

export default function ApplicantDetailHero({ details }) {
  const roleLabel = ROLE_LABELS[details.role] || details.role;
  const contacts = details.contacts || {};
  const RoleIcon = details.role === "researcher" ? Briefcase : GraduationCap;

  return (
    <div className="org-detail-hero applicant-detail-hero">
      <div className="org-detail-hero__media">
        <EntityAvatar src={details.photo_url} alt="" className="org-detail-hero__avatar" />
      </div>
      <div className="org-detail-hero__body applicant-detail-hero__body">
        <h1 className="org-detail-hero__title">{details.full_name || "Соискатель"}</h1>
        <div className="applicant-detail-hero__meta">
          <span className="applicant-detail-hero__role-chip">
            <RoleIcon size={14} className="applicant-detail-hero__role-icon" />
            {roleLabel}
          </span>
          {details.resume_url && (
            <a
              href={details.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="applicant-detail-hero__cta"
            >
              <FileDown size={14} className="applicant-detail-hero__cta-icon" />
              Скачать резюме
              <span className="applicant-detail-hero__cta-arrow" aria-hidden="true">
                →
              </span>
            </a>
          )}
        </div>
        <div className="applicant-detail-hero__contacts">
          {details.mail && (
            <a href={`mailto:${details.mail}`} className="applicant-detail-hero__contact applicant-detail-hero__contact--with-icon">
              <Mail size={14} className="applicant-detail-hero__contact-icon" />
              {details.mail}
            </a>
          )}
          {contacts.phone && (
            <a href={`tel:${contacts.phone}`} className="applicant-detail-hero__contact applicant-detail-hero__contact--with-icon">
              <Phone size={14} className="applicant-detail-hero__contact-icon" />
              {contacts.phone}
            </a>
          )}
          {contacts.telegram && (
            <a
              href={`https://t.me/${contacts.telegram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="applicant-detail-hero__contact applicant-detail-hero__contact--with-icon"
            >
              <Send size={14} className="applicant-detail-hero__contact-icon" />
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
