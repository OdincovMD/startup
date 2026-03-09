/**
 * Управление подпиской: статус, призыв к действию, FAQ о преимуществах.
 */
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";

const FAQ_ITEMS = [
  {
    q: "Что даёт подписка?",
    a: "Ваши организации, лаборатории, вакансии и запросы отображаются выше в результатах поиска. Платные карточки участвуют в блоках на главной странице.",
  },
  {
    q: "Как считается порядок показа?",
    a: "Сначала показываются платные сущности, внутри платного блока — по коэффициенту ранжирования (0–100) и дате. Ранжирование зависит от полноты и качества заполнения карточек.",
  },
  {
    q: "Как повысить позицию?",
    a: "Полнота профиля, свежесть контента и качество описаний влияют на коэффициент. Заполняйте все поля, добавляйте описания, обновляйте информацию.",
  },
  {
    q: "Как оформить подписку?",
    a: "Подключение подписки выполняется вручную администратором платформы. По вопросам подключения обратитесь в поддержку.",
  },
  {
    q: "Лаборатория в организации — тоже платная?",
    a: "Нет. Платность определяется только по создателю сущности (creator_user_id), а не по организации. Лаборатория, вступившая в платную организацию, не наследует платный статус.",
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
      <div className="profile-form">
        <div className="lab-tab-header">
          <p className="lab-tab-desc">Статус подписки и информация о преимуществах.</p>
        </div>
        <p className="muted">Загрузка…</p>
      </div>
    );
  }

  const active = subscription?.active === true;
  const expiresAt = subscription?.expires_at;
  const startedAt = subscription?.started_at;
  const daysLeft = daysUntil(expiresAt);
  const expiresSoon = daysLeft != null && daysLeft >= 0 && daysLeft < 30;

  return (
    <div className="profile-form subscription-tab">
      <div className="lab-tab-header">
        <p className="lab-tab-desc">
          Статус подписки, преимущества платного статуса и ответы на частые вопросы.
        </p>
      </div>

      <div className="profile-form-group dashboard-subscription-card">
        <div className="profile-form-group-title">Статус подписки</div>
        <div
          className={`dashboard-subscription-inner ${active ? "dashboard-subscription-active" : "dashboard-subscription-inactive"}`}
        >
          {active ? (
            <>
              <span className="dashboard-subscription-icon" aria-hidden="true">✓</span>
              <div className="dashboard-subscription-text">
                <strong>Подписка активна</strong>
                {startedAt && (
                  <span className="dashboard-subscription-expiry">
                    Начало: {formatDate(startedAt)}
                  </span>
                )}
                {expiresAt && (
                  <span className="dashboard-subscription-expiry">
                    Действует до {formatDate(expiresAt)}
                    {daysLeft != null && daysLeft >= 0 && (
                      <span className="subscription-days-left">
                        {" "}(осталось {daysLeft} дн.)
                      </span>
                    )}
                  </span>
                )}
              </div>
              {expiresSoon && (
                <a
                  href="mailto:?subject=Продление подписки"
                  className="secondary-btn dashboard-subscription-cta"
                  aria-label="Обратиться о продлении подписки"
                >
                  Обратиться о продлении
                </a>
              )}
            </>
          ) : (
            <>
              <span className="dashboard-subscription-icon dashboard-subscription-icon--inactive" aria-hidden="true">○</span>
              <div className="dashboard-subscription-text">
                <strong>Без подписки</strong>
                <p className="dashboard-subscription-hint">
                  Карточки показываются в общем каталоге. Подписка поднимает их выше в выдаче и на главной.
                </p>
              </div>
              <a
                href="mailto:?subject=Подключение подписки"
                className="secondary-btn dashboard-subscription-cta"
                aria-label="Связаться с администратором"
              >
                Связаться с администратором
              </a>
            </>
          )}
        </div>
      </div>

      <div className="profile-form-group subscription-benefits">
        <div className="profile-form-group-title">Что даёт подписка</div>
        <p className="profile-field-hint">
          Подписка для представителей организаций и лабораторий повышает видимость ваших карточек в каталоге.
        </p>
        <ul className="subscription-benefits-list">
          <li>Ваши организации, лаборатории, вакансии и запросы отображаются выше в результатах поиска.</li>
          <li>Платные карточки участвуют в блоках на главной странице.</li>
          <li>Ранжирование среди платных пользователей зависит от полноты и качества заполнения карточек.</li>
        </ul>
      </div>

      <div className="profile-form-group subscription-faq" role="region" aria-label="Частые вопросы о подписке">
        <div className="profile-form-group-title">Частые вопросы</div>
        <div className="subscription-faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <details key={i} className="subscription-faq-item" aria-label={item.q}>
              <summary className="subscription-faq-question">{item.q}</summary>
              <div className="subscription-faq-answer">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
