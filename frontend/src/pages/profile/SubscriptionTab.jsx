/**
 * Управление подпиской: статус, тарифы, рекомендации, FAQ.
 * Карточки тарифов — заглушки без действий.
 */
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

const TIER_CARDS = [
  {
    id: "trial",
    name: "Trial",
    tagline: "Пробный период",
    description: "Попробуйте Basic или Pro перед подключением",
    features: [
      "Полный функционал выбранного тарифа",
      "Ограниченный срок",
      "По запросу администратору",
    ],
    cta: "Запросить trial",
    accent: false,
    isTrial: true,
  },
  {
    id: "basic",
    name: "Basic",
    tagline: "Для малых команд",
    description: "1 организация или до 3 лабораторий, до 15 вакансий и 15 запросов",
    features: [
      "Приоритет в поиске",
      "Участие на главной",
      "Каталог соискателей",
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
      "Подписка на всю организацию",
      "Каталог соискателей",
      "Расширенная аналитика",
    ],
    cta: "Подключить",
    accent: true,
  },
];

const FAQ_ITEMS = [
  {
    q: "Что даёт подписка?",
    a: "Приоритет в поиске и на главной, больше просмотров и откликов.",
  },
  {
    q: "Как оформляется подписка?",
    a: "Подключение выполняет администратор. Напишите в поддержку с темой «Подключение подписки».",
  },
  {
    q: "Лаборатория в организации — нужна отдельная подписка?",
    a: "На Pro — нет, подписка распространяется на всю организацию. На Basic каждая лаборатория считается отдельно.",
  },
  {
    q: "Есть пробный период?",
    a: "Да. Запросите Trial у администратора платформы.",
  },
  {
    q: "Нужна ли подписка для каталога соискателей?",
    a: "Да. Каталог соискателей доступен при активной подписке Basic или Pro.",
  },
  {
    q: "Как улучшить позицию?",
    a: "Заполняйте описания, логотипы, сайты, контакты. Рекомендации по каждой карточке — в разделе «Аналитика».",
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
      <div className="profile-form-section subscription-tab">
        <h2 className="profile-section-card__title">Подписка</h2>
        <div className="subscription-loading">
          <div className="profile-skeleton subscription-skeleton-status" />
          <div className="profile-skeleton subscription-skeleton-tiers" />
        </div>
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
    <div className="profile-form-section subscription-tab">
      <h2 className="profile-section-card__title">Подписка</h2>
      <p className="profile-section-desc">
        Подписка повышает видимость организаций, лабораторий и вакансий в каталоге.
      </p>

      <section className="subscription-section" aria-labelledby="subscription-status-heading">
        <span id="subscription-status-heading" className="profile-summary-block-label">Ваш статус</span>
        <div className={`subscription-status-card ${active ? "subscription-status-card--active" : "subscription-status-card--inactive"}`}>
          {active ? (
            <>
              <div className="subscription-status-body">
                <div className="subscription-status-header">
                  <strong className="subscription-status-title">Подписка активна</strong>
                  <Badge variant="success">Активна</Badge>
                </div>
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
                  className="secondary-btn subscription-cta-btn"
                  aria-label="Обратиться о продлении"
                >
                  Обратиться о продлении
                </a>
              )}
            </>
          ) : (
            <>
              <div className="subscription-status-body">
                <strong className="subscription-status-title">Без подписки</strong>
                <p className="subscription-status-desc">
                  Ваши карточки участвуют в каталоге. Подписка повышает их позицию.
                </p>
              </div>
              <a
                href="mailto:?subject=Подключение подписки"
                className="secondary-btn subscription-cta-btn"
                aria-label="Связаться с администратором"
              >
                Связаться с администратором
              </a>
            </>
          )}
        </div>
      </section>

      <section className="subscription-section" aria-labelledby="subscription-tiers-heading">
        <span id="subscription-tiers-heading" className="profile-summary-block-label">Тарифы</span>
        <div className="subscription-tiers-grid">
          {TIER_CARDS.map((card) => (
            <Card
              key={card.id}
              variant="elevated"
              padding="md"
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
                  className="secondary-btn subscription-tier-cta"
                  aria-label="Запросить пробный период"
                >
                  {card.cta}
                </a>
              ) : (
                <Button
                  variant={card.accent ? "primary" : "secondary"}
                  disabled
                  className="subscription-tier-cta"
                  aria-label={`Подключить тариф ${card.name} (пока недоступно)`}
                >
                  {card.cta}
                </Button>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section className="subscription-section" aria-labelledby="subscription-tips-heading">
        <span id="subscription-tips-heading" className="profile-summary-block-label">Как улучшить видимость</span>
        <p className="subscription-tips-lead">
          Полнота профиля влияет на позицию. Рекомендации:
        </p>
        <ul className="subscription-tips-list">
          <li>Подробные описания организаций и лабораторий</li>
          <li>Логотип, сайт, адрес</li>
          <li>Фото лаборатории и направления деятельности</li>
          <li>Привязка лаборатории к организации</li>
          <li>Регулярное обновление</li>
        </ul>
        <p className="subscription-tips-footnote">
        </p>
      </section>

      <section className="subscription-section subscription-faq" role="region" aria-labelledby="subscription-faq-heading">
        <span id="subscription-faq-heading" className="profile-summary-block-label">Частые вопросы</span>
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
