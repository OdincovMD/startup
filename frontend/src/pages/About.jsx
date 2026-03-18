import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Mail, MapPin, Phone } from "lucide-react";

export default function About() {
  return (
    <main className="main privacy-page about-page">
      <div className="privacy-page__back">
        <Link to="/" className="privacy-page__back-link">
          <ArrowLeft size={18} aria-hidden />
          <span>На главную</span>
        </Link>
      </div>

      <div className="about-page__layout">
        <article className="privacy-page__content">
          <header className="privacy-page__header">
            <div className="privacy-page__header-icon">
              <Building2 size={40} aria-hidden />
            </div>
            <h1 className="privacy-page__title">О нас</h1>
            <p className="privacy-page__lead">
              Платформа научного найма Синтезум — связь между учёными, лабораториями и организациями.
            </p>
          </header>

          <div className="privacy-page__body">
            <section className="privacy-section">
              <h2 className="privacy-section__title">Поддержка проекта</h2>
              <p>
                Проект реализован при поддержке Фонда содействия инновациям в рамках программы «Студенческий стартап» мероприятия «Платформа университетского технологического предпринимательства» федерального проекта «Технологии».
              </p>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section__title">Контакты</h2>
              <div className="about-page__contacts">
                <p className="about-page__contact-row">
                  <MapPin size={18} aria-hidden className="about-page__contact-icon" />
                  <span>Москва, Борисовские пруды, 14к4, 34</span>
                </p>
                <p className="about-page__contact-row">
                  <Phone size={18} aria-hidden className="about-page__contact-icon" />
                  <a href="tel:+79299873125" className="privacy-page__link">+7 929 987-31-25</a>
                </p>
                <p className="about-page__contact-row">
                  <Mail size={18} aria-hidden className="about-page__contact-icon" />
                  <a href="mailto:info@sintezum.ru" className="privacy-page__link">info@sintezum.ru</a>
                </p>
              </div>
            </section>
          </div>

          <footer className="privacy-page__footer">
            <Link to="/" className="privacy-page__cta">
              Вернуться на главную
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
