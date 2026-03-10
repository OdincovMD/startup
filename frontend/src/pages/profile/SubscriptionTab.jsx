/**
 * Управление подпиской: статус, тарифы, FAQ.
 * Карточки тарифов — заглушки без действий.
 */
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";

const TIER_CARDS = [
  {
    id: "trial",
    name: "Trial",
    tagline: "Пробный период",
    description: "Попробуйте Basic или Pro до оформления подписки",
    features: [
      "Все возможности выбранного тарифа",
      "Ограниченный срок (например, 14 дней)",
      "Оформляется по запросу администратором",
    ],
    cta: "Запросить trial",
    accent: false,
    isTrial: true,
  },
  {
    id: "basic",
    name: "Basic",
    tagline: "Для начинающих",
    description: "1 организация или до 3 самостоятельных лабораторий, до 15 вакансий и 15 запросов",
    features: [
      "Приоритетная выдача в поиске",
      "Участие в блоках на главной",
      "Доступ к каталогу соискателей",
      "До 15 вакансий и 15 запросов",
    ],
    cta: "Подключить",
    accent: false,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Для крупных структур",
    description: "Без лимитов",
    features: [
      "Всё из Basic",
      "Лаборатории организации наследуют статус",
      "Доступ к каталогу соискателей",
      "Расширенная аналитика",
    ],
    cta: "Подключить",
    accent: true,
  },
];

const FAQ_ITEMS = [
  {
    q: "Что даёт подписка?",
    a: "Ваши организации, лаборатории, вакансии и запросы показываются выше в результатах поиска и на главной странице. Подписчики получают больше просмотров и откликов.",
  },
  {
    q: "Как устроена выдача?",
    a: "Карточки подписчиков показываются первым блоком. Внутри блока порядок зависит от полноты профилей и качества контента — заполненные карточки занимают более выгодные позиции.",
  },
  {
    q: "Как улучшить позицию?",
    a: "Добавляйте описания (от 300 символов для организации и лаборатории), логотипы, сайты, контакты. Регулярно обновляйте информацию. Подробные советы — в разделе «Аналитика».",
  },
  {
    q: "Как оформить подписку?",
    a: "Подключение выполняет администратор платформы. Напишите на почту поддержки с темой «Подключение подписки» — мы ответим в течение рабочего дня.",
  },
  {
    q: "Лаборатория в организации — нужна отдельная подписка?",
    a: "На тарифе Pro лаборатории, вступившие в вашу организацию, автоматически получают приоритет в выдаче. На Basic каждая лаборатория учитывается отдельно.",
  },
  {
    q: "Есть пробный период?",
    a: "Да. Trial — пробная подписка на Basic или Pro на ограниченный срок (например, 14 дней). Запросите её у администратора платформы. Кроме того, первые 7 дней после создания первой организации или лаборатории действует grace period — повышенная видимость бесплатно.",
  },
  {
    q: "Нужна ли подписка для доступа к разделу соискателей?",
    a: "Да. Раздел соискателей (профили студентов и исследователей) доступен только пользователям с активной подпиской. Представители организаций и лабораторий (lab_admin, lab_representative) могут просматривать каталог соискателей и их контакты только при наличии подписки Basic или Pro.",
  },
];

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function daysUntil(iso) {
  if (!iso) return null;
  try {
    const exp = new Date(iso);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp - now) / (24 * 60 * 60 * 1000));
  } catch {
    return null;
  }
}

export default function SubscriptionTab({ onError }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiRequest("/profile/subscription");
        if (!cancelled) setSubscription(res || null);
      } catch (e) {
        if (!cancelled) onError?.(e.message);
        setSubscription(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [onError]);

  if (loading) {
    return (
      <div className="profile-form subscription-tab">
        <div className="lab-tab-header">
          <p className="lab-tab-desc">Статус подписки и тарифы.</p>
        </div>
        <p className="muted">Загрузка…</p>
      </div>
    );
  }

  const active = subscription?.active === true;
  const tier = subscription?.tier || "pro";
  const expiresAt = subscription?.expires_at;
  const trialEndsAt = subscription?.trial_ends_at;
  const startedAt = subscription?.started_at;
  const daysLeft = daysUntil(expiresAt);
  const trialDaysLeft = daysUntil(trialEndsAt);
  const expiresSoon = daysLeft != null && daysLeft >= 0 && daysLeft < 30;
  const isTrial = trialEndsAt && trialDaysLeft != null && trialDaysLeft >= 0;

  return (
    <div className="profile-form subscription-tab">
      <div className="subscription-tab-hero">
        <h2 className="subscription-tab-title">Подписка</h2>
        <p className="subscription-tab-lead">
          Повысьте видимость ваших организаций, лабораторий и вакансий в каталоге Синтезум.
        </p>
      </div>

      <section className="subscription-status-section" aria-labelledby="subscription-status-heading">
        <h3 id="subscription-status-heading" className="subscription-section-title">Ваш статус</h3>
        <div
          className={`subscription-status-card ${active ? "subscription-status-card--active" : "subscription-status-card--inactive"}`}
        >
          {active ? (
            <>
              <div className="subscription-status-badge" aria-hidden="true">
                <span className="subscription-status-icon">✓</span>
              </div>
              <div className="subscription-status-body">
                <strong className="subscription-status-title">Подписка активна</strong>
                {tier && (
                  <span className="subscription-status-tier">
                    Тариф: {tier === "basic" ? "Basic" : "Pro"}
                    {isTrial && " (Trial)"}
                  </span>
                )}
                {isTrial && (
                  <p className="subscription-status-meta">
                    Пробный период до {formatDate(trialEndsAt)}
                    {trialDaysLeft != null && trialDaysLeft >= 0 && (
                      <span className="subscription-status-days"> (осталось {trialDaysLeft} дн.)</span>
                    )}
                  </p>
                )}
                {startedAt && !isTrial && (
                  <p className="subscription-status-meta">Подключена {formatDate(startedAt)}</p>
                )}
                {expiresAt && (
                  <p className="subscription-status-meta">
                    Действует до {formatDate(expiresAt)}
                    {daysLeft != null && daysLeft >= 0 && (
                      <span className="subscription-status-days"> (осталось {daysLeft} дн.)</span>
                    )}
                  </p>
                )}
              </div>
              {expiresSoon && (
                <a
                  href="mailto:?subject=Продление подписки"
                  className="subscription-cta-btn secondary-btn"
                  aria-label="Обратиться о продлении"
                >
                  Обратиться о продлении
                </a>
              )}
            </>
          ) : (
            <>
              <div className="subscription-status-badge subscription-status-badge--inactive" aria-hidden="true">
                <span className="subscription-status-icon">○</span>
              </div>
              <div className="subscription-status-body">
                <strong className="subscription-status-title">Без подписки</strong>
                <p className="subscription-status-desc">
                  Ваши карточки участвуют в каталоге на общих условиях. Подписка поднимает их выше и увеличивает просмотры.
                </p>
              </div>
              <a
                href="mailto:?subject=Подключение подписки"
                className="subscription-cta-btn secondary-btn"
                aria-label="Связаться с администратором"
              >
                Связаться с администратором
              </a>
            </>
          )}
        </div>
      </section>

      <section className="subscription-tiers-section" aria-labelledby="subscription-tiers-heading">
        <h3 id="subscription-tiers-heading" className="subscription-section-title">Тарифы</h3>
        <div className="subscription-tiers-grid">
          {TIER_CARDS.map((card) => (
            <article
              key={card.id}
              className={`subscription-tier-card ${card.accent ? "subscription-tier-card--accent" : ""}`}
            >
              <div className="subscription-tier-card-header">
                <span className="subscription-tier-tagline">{card.tagline}</span>
                <h4 className="subscription-tier-name">{card.name}</h4>
                <p className="subscription-tier-desc">{card.description}</p>
              </div>
              <ul className="subscription-tier-features" aria-label={`Преимущества тарифа ${card.name}`}>
                {card.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              {card.isTrial ? (
                <a
                  href="mailto:?subject=Запрос пробного периода подписки"
                  className={`subscription-tier-cta secondary-btn`}
                  aria-label="Запросить пробный период"
                >
                  {card.cta}
                </a>
              ) : (
                <button
                  type="button"
                  className={`subscription-tier-cta ${card.accent ? "primary-btn" : "secondary-btn"}`}
                  disabled
                  aria-label={`Подключить тариф ${card.name} (пока недоступно)`}
                >
                  {card.cta}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="subscription-tips-section" aria-labelledby="subscription-tips-heading">
        <h3 id="subscription-tips-heading" className="subscription-section-title">Как улучшить видимость</h3>
        <p className="subscription-tips-lead">
          Независимо от подписки, полнота профилей влияет на позицию в выдаче. Рекомендации:
        </p>
        <ul className="subscription-tips-list">
          <li>Описание от 300 символов — для организации и лаборатории</li>
          <li>Логотип, сайт, ROR ID, адрес — заполненные поля повышают привлекательность</li>
          <li>Минимум 2 фото лаборатории, направления деятельности, руководитель</li>
          <li>Привязка лаборатории к организации</li>
          <li>Регулярное обновление контента</li>
        </ul>
        <p className="subscription-tips-footnote">
          Персональные подсказки по каждой карточке — в разделе «Аналитика».
        </p>
      </section>

      <section className="subscription-faq-section" role="region" aria-labelledby="subscription-faq-heading">
        <h3 id="subscription-faq-heading" className="subscription-section-title">Частые вопросы</h3>
        <div className="subscription-faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <details key={i} className="subscription-faq-item" aria-label={item.q}>
              <summary className="subscription-faq-question">{item.q}</summary>
              <div className="subscription-faq-answer">{item.a}</div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
