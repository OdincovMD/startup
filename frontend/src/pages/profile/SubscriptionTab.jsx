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
    description: "1 организация или до 3 лабораторий",
    features: [
      "Приоритет в поиске",
      "Участие на главной",
      "До 15 вакансий и 15 запросов",
      "Каталог соискателей",
    ],
    cta: "Подключить",
    accent: false,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Для крупных структур",
    description: "Без лимитов и ограничений",
    features: [
      "Всё из Basic",
      "Статус на всю организацию",
      "Расширенная аналитика",
      "Безлимитные вакансии/запросы",
    ],
    cta: "Подключить",
    accent: true,
  },
];

const FAQ_ITEMS = [
  {
    q: "Что даёт подписка?",
    a: "Приоритет в поиске и на главной (верхний блок), больше просмотров и откликов. Платные карточки всегда отображаются выше бесплатных.",
  },
  {
    q: "Как подписка влияет на позицию в поиске?",
    a: "Для платных аккаунтов применяется дополнительный множитель (boost), зависящий от качества заполнения профиля (rank score). Чем лучше заполнен профиль, тем выше позиция.",
  },
  {
    q: "Как оформляется подписка?",
    a: "Подключение выполняет администратор. Напишите в поддержку с темой «Подключение подписки».",
  },
  {
    q: "Лаборатория в организации — нужна отдельная подписка?",
    a: "На Pro — нет, подписка распространяется на всю организацию (Org-wide). На Basic каждая лаборатория считается отдельно.",
  },
  {
    q: "Что такое Grace Period?",
    a: "Это 7 дней бесплатного приоритетного размещения для новых пользователей (после создания первой организации или лаборатории).",
  },
  {
    q: "Есть пробный период?",
    a: "Да. Вы можете запросить Trial у администратора платформы для тестирования возможностей тарифов.",
  },
  {
    q: "Как улучшить позицию?",
    a: "Заполняйте описания (от 300 симв.), добавляйте фото, логотипы, сайты и контакты. Также учитывается «возраст» карточки — за каждые 6 месяцев активности начисляется бонус.",
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

export default function SubscriptionTab({ onError, orgProfile, orgLabs, orgVacancies, orgQueries }) {
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
  const tier = subscription?.tier || "basic";
  const expiresAt = subscription?.expires_at;
  const trialEndsAt = subscription?.trial_ends_at;
  const startedAt = subscription?.started_at;
  const daysLeft = daysUntil(expiresAt);
  const trialDaysLeft = daysUntil(trialEndsAt);
  const expiresSoon = daysLeft != null && daysLeft >= 0 && daysLeft < 30;
  const isTrial = trialEndsAt && trialDaysLeft != null && trialDaysLeft >= 0;

  // Grace period logic (7 days from creation)
  const createdDate = orgProfile?.created_at ? new Date(orgProfile.created_at) : null;
  const graceDaysLeft = createdDate ? 7 - Math.floor((new Date() - createdDate) / (24 * 60 * 60 * 1000)) : 0;
  const isGracePeriod = !active && graceDaysLeft > 0;

  // Usage stats
  const labsCount = orgLabs?.length || 0;
  const vacanciesCount = orgVacancies?.length || 0;
  const queriesCount = orgQueries?.length || 0;

  const limits = {
    basic: { labs: 3, vacancies: 15, queries: 15 },
    pro: { labs: Infinity, vacancies: Infinity, queries: Infinity },
  };

  const currentTierLimits = tier === "pro" && active ? limits.pro : limits.basic;

  return (
    <div className="profile-form-section subscription-tab">
      <h2 className="profile-section-card__title">Подписка</h2>
      <p className="profile-section-desc">
        Подписка повышает видимость организаций, лабораторий и вакансий в каталоге.
      </p>

      <section className="subscription-section" aria-labelledby="subscription-status-heading">
        <span id="subscription-status-heading" className="profile-summary-block-label">Ваш статус</span>
        <div className={`subscription-status-card ${active || isGracePeriod ? "subscription-status-card--active" : "subscription-status-card--inactive"}`}>
          {(active || isGracePeriod) ? (
            <>
              <div className="subscription-status-body">
                <div className="subscription-status-header">
                  <strong className="subscription-status-title">
                    {isGracePeriod ? "Пробный доступ (Grace Period)" : "Подписка активна"}
                  </strong>
                  <Badge variant="success">Активна</Badge>
                </div>
                {tier && !isGracePeriod && (
                  <span className="subscription-status-tier">
                    Тариф: {tier === "basic" ? "Basic" : "Pro"}
                    {isTrial && " (Trial)"}
                  </span>
                )}
                {isGracePeriod && (
                  <p className="subscription-status-meta">
                    У вас есть 7 дней бесплатного приоритетного размещения.
                    <span className="subscription-status-days"> (осталось {graceDaysLeft} дн.)</span>
                  </p>
                )}
                {isTrial && (
                  <p className="subscription-status-meta">
                    Пробный период до {formatDate(trialEndsAt)}
                    {trialDaysLeft != null && trialDaysLeft >= 0 && (
                      <span className="subscription-status-days"> (осталось {trialDaysLeft} дн.)</span>
                    )}
                  </p>
                )}
                {startedAt && !isTrial && !isGracePeriod && (
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
              {(expiresSoon || isGracePeriod) && (
                <a
                  href={`mailto:?subject=${isGracePeriod ? "Подключение подписки" : "Продление подписки"}`}
                  className="secondary-btn subscription-cta-btn"
                  aria-label={isGracePeriod ? "Подключить подписку" : "Обратиться о продлении"}
                >
                  {isGracePeriod ? "Подключить подписку" : "Обратиться о продлении"}
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

      <section className="subscription-section" aria-labelledby="subscription-usage-heading">
        <span id="subscription-usage-heading" className="profile-summary-block-label">Использование лимитов</span>
        <div className="subscription-usage-grid">
          <div className="subscription-usage-item">
            <div className="subscription-usage-info">
              <span>Лаборатории</span>
              <span>{labsCount} / {currentTierLimits.labs === Infinity ? "∞" : currentTierLimits.labs}</span>
            </div>
            <div className="subscription-usage-bar">
              <div
                className={`subscription-usage-progress ${currentTierLimits.labs !== Infinity && labsCount >= currentTierLimits.labs ? "subscription-usage-progress--full" : ""}`}
                style={{ width: `${currentTierLimits.labs === Infinity ? 0 : Math.min(100, (labsCount / currentTierLimits.labs) * 100)}%` }}
              />
            </div>
          </div>
          <div className="subscription-usage-item">
            <div className="subscription-usage-info">
              <span>Вакансии</span>
              <span>{vacanciesCount} / {currentTierLimits.vacancies === Infinity ? "∞" : currentTierLimits.vacancies}</span>
            </div>
            <div className="subscription-usage-bar">
              <div
                className={`subscription-usage-progress ${currentTierLimits.vacancies !== Infinity && vacanciesCount >= currentTierLimits.vacancies ? "subscription-usage-progress--full" : ""}`}
                style={{ width: `${currentTierLimits.vacancies === Infinity ? 0 : Math.min(100, (vacanciesCount / currentTierLimits.vacancies) * 100)}%` }}
              />
            </div>
          </div>
          <div className="subscription-usage-item">
            <div className="subscription-usage-info">
              <span>Запросы</span>
              <span>{queriesCount} / {currentTierLimits.queries === Infinity ? "∞" : currentTierLimits.queries}</span>
            </div>
            <div className="subscription-usage-bar">
              <div
                className={`subscription-usage-progress ${currentTierLimits.queries !== Infinity && queriesCount >= currentTierLimits.queries ? "subscription-usage-progress--full" : ""}`}
                style={{ width: `${currentTierLimits.queries === Infinity ? 0 : Math.min(100, (queriesCount / currentTierLimits.queries) * 100)}%` }}
              />
            </div>
          </div>
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
