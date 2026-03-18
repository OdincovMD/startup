import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const SECTIONS = [
  { id: "intro", title: "Введение" },
  { id: "data", title: "Какие данные мы собираем" },
  { id: "purposes", title: "Цели обработки" },
  { id: "storage", title: "Хранение и защита" },
  { id: "sharing", title: "Передача данных" },
  { id: "cookies", title: "Файлы cookie" },
  { id: "rights", title: "Ваши права" },
  { id: "updates", title: "Изменения политики" },
  { id: "contact", title: "Контакты" },
];

export default function Privacy() {
  const [activeId, setActiveId] = useState("intro");
  const contentRef = React.useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="main privacy-page">
      <div className="privacy-page__back">
        <Link to="/" className="privacy-page__back-link">
          <ArrowLeft size={18} aria-hidden />
          <span>На главную</span>
        </Link>
      </div>

      <div className="privacy-page__layout">
        <aside className="privacy-page__toc" aria-label="Содержание">
          <div className="privacy-page__toc-sticky">
            <h2 className="privacy-page__toc-title">Содержание</h2>
            <nav>
              <ul className="privacy-page__toc-list">
                {SECTIONS.map(({ id, title }) => (
                  <li key={id}>
                    <button
                      type="button"
                      className={`privacy-page__toc-link ${activeId === id ? "privacy-page__toc-link--active" : ""}`}
                      onClick={() => scrollToSection(id)}
                    >
                      {title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        <article className="privacy-page__content" ref={contentRef}>
          <header className="privacy-page__header">
            <div className="privacy-page__header-icon">
              <Shield size={40} aria-hidden />
            </div>
            <h1 className="privacy-page__title">Политика конфиденциальности</h1>
            <p className="privacy-page__lead">
              Платформа научного найма Синтезум уважает вашу конфиденциальность. Ниже — как мы обрабатываем персональные данные.
            </p>
            <p className="privacy-page__meta">Последнее обновление: март 2025 г.</p>
          </header>

          <div className="privacy-page__body">
            <section id="intro" className="privacy-section">
              <h2 className="privacy-section__title">1. Введение</h2>
              <p>
                Настоящая Политика конфиденциальности описывает порядок сбора, хранения и использования персональных данных пользователей платформы Синтезум. Мы не передаём ваши данные третьим лицам в маркетинговых целях и соблюдаем требования законодательства РФ (152-ФЗ «О персональных данных»).
              </p>
            </section>

            <section id="data" className="privacy-section">
              <h2 className="privacy-section__title">2. Какие данные мы собираем</h2>
              <ul>
                <li><strong>Аккаунт:</strong> email, пароль (в хэшированном виде), ORCID при привязке.</li>
                <li><strong>Профиль:</strong> ФИО, фото, учёная степень, научные интересы, образование, публикации, контакты — по мере заполнения.</li>
                <li><strong>Организации и лаборатории:</strong> наименования, описание, адрес, сайт, логотипы, данные сотрудников.</li>
                <li><strong>Вакансии и запросы:</strong> содержание объявлений, отклики, история взаимодействий.</li>
                <li><strong>Технические данные:</strong> IP, User-Agent, время сессий — для безопасности и аналитики.</li>
              </ul>
            </section>

            <section id="purposes" className="privacy-section">
              <h2 className="privacy-section__title">3. Цели обработки</h2>
              <p>Мы используем данные для:</p>
              <ul>
                <li>Предоставления функционала платформы (регистрация, профили, поиск, подписки).</li>
                <li>Связи с вами (уведомления, восстановление пароля, отклики на вакансии).</li>
                <li>Улучшения сервиса и устранения ошибок.</li>
                <li>Соблюдения юридических обязанностей.</li>
              </ul>
            </section>

            <section id="storage" className="privacy-section">
              <h2 className="privacy-section__title">4. Хранение и защита</h2>
              <p>
                Данные хранятся на серверах в РФ. Мы применяем шифрование (TLS), ограничение доступа и регулярные проверки. Пароли не хранятся в открытом виде — только криптографические хэши.
              </p>
            </section>

            <section id="sharing" className="privacy-section">
              <h2 className="privacy-section__title">5. Передача данных</h2>
              <p>
                Мы не продаём персональные данные. Передача возможна только: (а) по вашему согласию, (б) по требованию закона, (в) партнёрам, необходимым для работы сервиса (хостинг, аналитика), при наличии договоров о конфиденциальности.
              </p>
            </section>

            <section id="cookies" className="privacy-section">
              <h2 className="privacy-section__title">6. Файлы cookie</h2>
              <p>
                Мы используем необходимые cookie для сессий, авторизации и базовой аналитики. При первом посещении можно ограничить необязательные cookie через настройки или баннер.
              </p>
            </section>

            <section id="rights" className="privacy-section">
              <h2 className="privacy-section__title">7. Ваши права</h2>
              <p>Вы вправе:</p>
              <ul>
                <li>Получить копию своих персональных данных.</li>
                <li>Исправить или дополнить информацию в профиле.</li>
                <li>Отозвать согласие на обработку (в части, где это допускается).</li>
                <li>Удалить аккаунт — мы прекратим обработку в разумный срок.</li>
              </ul>
              <p>Для реализации прав обратитесь по контактам ниже.</p>
            </section>

            <section id="updates" className="privacy-section">
              <h2 className="privacy-section__title">8. Изменения политики</h2>
              <p>
                Мы можем обновлять политику. Существенные изменения будут сообщены по email или через уведомление в личном кабинете. Продолжение использования сервиса после публикации изменений означает принятие обновлённой политики.
              </p>
            </section>

            <section id="contact" className="privacy-section">
              <h2 className="privacy-section__title">9. Контакты</h2>
              <p>
                По вопросам персональных данных: <a href="mailto:privacy@syntezum.ru" className="privacy-page__link">privacy@syntezum.ru</a>. Вы также можете написать через форму обратной связи на сайте.
              </p>
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
