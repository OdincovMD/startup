import React from "react";
import { AUTH_FEATURES } from "./constants";

const DEFAULT_BRAND = {
  headline: "Научная экосистема для исследователей",
  desc: "Объединяем лаборатории, организации и специалистов для совместного развития науки.",
};

export function AuthSplitLayout({
  children,
  brandHeadline = DEFAULT_BRAND.headline,
  brandDesc = DEFAULT_BRAND.desc,
}) {
  return (
    <div className="auth-page auth-page--split" role="main">
      <div className="auth-split">
        {/* ── Left brand panel ── */}
        <div className="auth-split__brand" aria-hidden="true">
          <div className="auth-split__brand-inner">
            <div className="auth-split__brand-logo">Синтезум</div>
            <h2 className="auth-split__brand-headline">{brandHeadline}</h2>
            <p className="auth-split__brand-desc">{brandDesc}</p>
            <ul className="auth-split__features">
              {AUTH_FEATURES.map(({ icon, text }) => (
                <li key={text} className="auth-split__feature">
                  <span className="auth-split__feature-icon">{icon}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Decorative blobs */}
          <div className="auth-split__blob auth-split__blob--1" />
          <div className="auth-split__blob auth-split__blob--2" />
        </div>

        {/* ── Right form panel ── */}
        <div className="auth-split__form">{children}</div>
      </div>
    </div>
  );
}
