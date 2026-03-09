/**
 * Дашборд представителя: сводка (KPI), графики, детализация.
 * User-friendly: общие рекомендации вынесены в отдельный блок.
 */
import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import { apiRequest } from "../../api/client";

const COLORS = { vacancy: "#8884d8", laboratory: "#82ca9d", query: "#ffc658" };
const PIE_COLORS = [COLORS.vacancy, COLORS.laboratory, COLORS.query];

const CHART_HEIGHT_DEFAULT = 280;
const CHART_HEIGHT_MOBILE = 200;
const CHART_HEIGHT_SMALL = 220;

const GENERAL_RECOMMENDATIONS = [
  "Описание от 300 символов — для организации и лаборатории",
  "Логотип, сайт, ROR ID, адрес — заполненные поля повышают привлекательность",
  "Минимум 2 фото лаборатории, направления деятельности, руководитель",
  "Привязка лаборатории к организации",
  "Регулярное обновление контента",
];

function useChartHeight() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return useMemo(() => {
    if (width <= 480) return CHART_HEIGHT_MOBILE;
    if (width <= 768) return CHART_HEIGHT_SMALL;
    return CHART_HEIGHT_DEFAULT;
  }, [width]);
}

export default function EmployerDashboard({ onError, onNavigateToSubscription }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartHeight = useChartHeight();
  const chartHeightSmall = Math.round(chartHeight * 0.9);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiRequest("/profile/analytics/dashboard");
        if (!cancelled) setData(res || null);
      } catch (e) {
        if (!cancelled) onError?.(e.message);
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [onError]);

  if (loading) {
    return (
      <div className="profile-form dashboard-page">
        <div className="dashboard-hero">
          <h2 className="dashboard-hero-title">Аналитика</h2>
          <p className="dashboard-hero-desc">Просмотры, отклики и динамика за 30 дней.</p>
        </div>
        <p className="muted">Загрузка…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="profile-form dashboard-page">
        <div className="dashboard-hero">
          <h2 className="dashboard-hero-title">Аналитика</h2>
          <p className="dashboard-hero-desc">Просмотры, отклики и динамика.</p>
        </div>
        <p className="muted">Не удалось загрузить данные.</p>
      </div>
    );
  }

  const {
    summary,
    by_vacancy = [],
    by_laboratory = [],
    by_query = [],
    views_over_time = [],
    responses_over_time = [],
    subscription = null,
  } = data;
  const subscriptionActive = subscription?.active === true;
  const subscriptionExpiresAt = subscription?.expires_at;
  const hasAnyContent = by_vacancy.length > 0 || by_laboratory.length > 0 || by_query.length > 0;
  const hasCharts = views_over_time.length > 0 || responses_over_time.length > 0;

  const viewsChartData = views_over_time.map((d) => ({
    date: d.date,
    total: d.total ?? 0,
    vacancy: d.by_entity_type?.vacancy ?? 0,
    laboratory: d.by_entity_type?.laboratory ?? 0,
    query: d.by_entity_type?.query ?? 0,
  }));

  const pieData = [
    { name: "Вакансии", value: (views_over_time.reduce((s, d) => s + (d.by_entity_type?.vacancy ?? 0), 0)) || 0 },
    { name: "Лаборатории", value: (views_over_time.reduce((s, d) => s + (d.by_entity_type?.laboratory ?? 0), 0)) || 0 },
    { name: "Запросы", value: (views_over_time.reduce((s, d) => s + (d.by_entity_type?.query ?? 0), 0)) || 0 },
  ].filter((d) => d.value > 0);

  const subscriptionStartDate = subscription?.started_at ? subscription.started_at.slice(0, 10) : null;
  const showSubLineOnViews = subscriptionStartDate && viewsChartData.some((d) => d.date === subscriptionStartDate);
  const showSubLineOnResponses = subscriptionStartDate && responses_over_time.some((d) => d.date === subscriptionStartDate);

  return (
    <div className="profile-form dashboard-page">
      <header className="dashboard-hero">
        <h2 className="dashboard-hero-title">Аналитика</h2>
        <p className="dashboard-hero-desc">
          Просмотры, отклики и динамика по вакансиям, лабораториям и запросам за последние 30 дней.
        </p>
        {onNavigateToSubscription && (
          <div className="dashboard-hero-subscription">
            {subscriptionActive && subscriptionExpiresAt ? (
              <>
                <span className="dashboard-hero-subscription-status">Подписка до {new Date(subscriptionExpiresAt).toLocaleDateString("ru-RU")}</span>
                <button type="button" className="profile-link-btn" onClick={onNavigateToSubscription}>
                  Управление →
                </button>
              </>
            ) : !subscriptionActive && subscription !== null ? (
              <>
                <span className="dashboard-hero-subscription-status">Без подписки</span>
                <button type="button" className="profile-link-btn" onClick={onNavigateToSubscription}>
                  Узнать о подписке →
                </button>
              </>
            ) : null}
          </div>
        )}
      </header>

      <div className="dashboard-recommendations-card">
        <details className="dashboard-recommendations-details">
          <summary className="dashboard-recommendations-summary">
            <span className="dashboard-recommendations-icon" aria-hidden>◉</span>
            Общие рекомендации
          </summary>
          <div className="dashboard-recommendations-body">
            <p className="dashboard-recommendations-lead">
              Как улучшить видимость карточек в каталоге и поиске.
            </p>
            <ul className="dashboard-recommendations-list">
              {GENERAL_RECOMMENDATIONS.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </details>
      </div>

      {summary && (
        <section className="dashboard-section dashboard-section--metrics">
          <h3 className="dashboard-section-title">Вакансии и отклики</h3>
          <div className="dashboard-metrics">
            <div className="dashboard-metric dashboard-metric--primary">
              <span className="dashboard-metric-value">{summary.total_vacancies_published ?? 0}</span>
              <span className="dashboard-metric-label">Опубликовано</span>
            </div>
            <div className="dashboard-metric dashboard-metric--primary">
              <span className="dashboard-metric-value">{summary.total_responses ?? 0}</span>
              <span className="dashboard-metric-label">Всего откликов</span>
            </div>
            <div className="dashboard-metric">
              <span className="dashboard-metric-value">{summary.new_count ?? 0}</span>
              <span className="dashboard-metric-label">Новых</span>
            </div>
            <div className="dashboard-metric">
              <span className="dashboard-metric-value">{summary.accepted_count ?? 0}</span>
              <span className="dashboard-metric-label">Принято</span>
            </div>
            <div className="dashboard-metric">
              <span className="dashboard-metric-value">{summary.rejected_count ?? 0}</span>
              <span className="dashboard-metric-label">Отклонено</span>
            </div>
            <div className="dashboard-metric">
              <span className="dashboard-metric-value">{summary.vacancies_with_zero_responses ?? 0}</span>
              <span className="dashboard-metric-label">Без откликов</span>
            </div>
            {summary.avg_responses_per_vacancy != null && (
              <div className="dashboard-metric">
                <span className="dashboard-metric-value">{summary.avg_responses_per_vacancy}</span>
                <span className="dashboard-metric-label">Ср. откликов</span>
              </div>
            )}
            {summary.accepted_rate != null && (
              <div className="dashboard-metric">
                <span className="dashboard-metric-value">{summary.accepted_rate}%</span>
                <span className="dashboard-metric-label">Доля принятых</span>
              </div>
            )}
            {summary.avg_days_to_first_response != null && (
              <div className="dashboard-metric">
                <span className="dashboard-metric-value">{summary.avg_days_to_first_response}</span>
                <span className="dashboard-metric-label">Дней до 1-го отклика</span>
              </div>
            )}
            {summary.avg_days_to_first_acceptance != null && (
              <div className="dashboard-metric">
                <span className="dashboard-metric-value">{summary.avg_days_to_first_acceptance}</span>
                <span className="dashboard-metric-label">Дней до 1-го принятия</span>
              </div>
            )}
          </div>
        </section>
      )}

      {hasCharts && (
        <section className="dashboard-section dashboard-section--charts">
          <h3 className="dashboard-section-title">Динамика за 30 дней</h3>
          {viewsChartData.length > 0 && (
            <div className="dashboard-chart-wrap">
              <h4 className="dashboard-chart-title">Просмотры по дням</h4>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={viewsChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(v) => v} />
                  <Legend />
                  {showSubLineOnViews && (
                    <ReferenceLine x={subscriptionStartDate} stroke="#b85c38" strokeDasharray="4 4" label={{ value: "Подписка", fill: "#b85c38", fontSize: 10 }} />
                  )}
                  <Area type="monotone" dataKey="vacancy" name="Вакансии" stroke={COLORS.vacancy} fill={COLORS.vacancy} fillOpacity={0.4} stackId="1" />
                  <Area type="monotone" dataKey="laboratory" name="Лаборатории" stroke={COLORS.laboratory} fill={COLORS.laboratory} fillOpacity={0.4} stackId="1" />
                  <Area type="monotone" dataKey="query" name="Запросы" stroke={COLORS.query} fill={COLORS.query} fillOpacity={0.4} stackId="1" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {responses_over_time.length > 0 && (
            <div className="dashboard-chart-wrap">
              <h4 className="dashboard-chart-title">Отклики по дням</h4>
              <ResponsiveContainer width="100%" height={chartHeightSmall}>
                <BarChart data={responses_over_time} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(v) => v} />
                  {showSubLineOnResponses && (
                    <ReferenceLine x={subscriptionStartDate} stroke="#b85c38" strokeDasharray="4 4" label={{ value: "Подписка", fill: "#b85c38", fontSize: 10 }} />
                  )}
                  <Bar dataKey="count" name="Откликов" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {pieData.length > 0 && (
            <div className="dashboard-chart-wrap dashboard-chart-wrap--pie">
              <h4 className="dashboard-chart-title">Просмотры по типу</h4>
              <ResponsiveContainer width="100%" height={chartHeightSmall}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      {!hasAnyContent && (
        <section className="dashboard-section">
          <p className="dashboard-empty-state">
            Добавьте вакансии, лаборатории или запросы и опубликуйте их — здесь появятся статистика и графики.
          </p>
        </section>
      )}

      {hasAnyContent && (
        <>
          {by_vacancy.length > 0 && (
            <section className="dashboard-section dashboard-section--table">
              <h3 className="dashboard-section-title">Вакансии</h3>
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Просмотры</th>
                      <th>Зрители</th>
                      <th>Отклики</th>
                      <th>Конверсия</th>
                      <th>Ср. время</th>
                    </tr>
                  </thead>
                  <tbody>
                    {by_vacancy.map((v) => (
                      <tr key={v.vacancy_id}>
                        <td className="dashboard-table-name">{v.name || "—"}</td>
                        <td>{v.view_count ?? 0}</td>
                        <td>{v.unique_viewers ?? 0}</td>
                        <td>{v.response_count ?? 0}</td>
                        <td>{v.conversion_rate != null ? `${(v.conversion_rate * 100).toFixed(1)}%` : "—"}</td>
                        <td>{v.avg_time_on_page_sec != null ? `${v.avg_time_on_page_sec} с` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {by_laboratory.length > 0 && (
            <section className="dashboard-section dashboard-section--table">
              <h3 className="dashboard-section-title">Лаборатории</h3>
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Просмотры</th>
                      <th>Зрители</th>
                      <th>Ср. время</th>
                    </tr>
                  </thead>
                  <tbody>
                    {by_laboratory.map((lab) => (
                      <tr key={lab.laboratory_id}>
                        <td className="dashboard-table-name">{lab.name || "—"}</td>
                        <td>{lab.view_count ?? 0}</td>
                        <td>{lab.unique_viewers ?? 0}</td>
                        <td>{lab.avg_time_on_page_sec != null ? `${lab.avg_time_on_page_sec} с` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {by_query.length > 0 && (
            <section className="dashboard-section dashboard-section--table">
              <h3 className="dashboard-section-title">Запросы</h3>
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Просмотры</th>
                      <th>Зрители</th>
                      <th>Ср. время</th>
                    </tr>
                  </thead>
                  <tbody>
                    {by_query.map((q) => (
                      <tr key={q.query_id}>
                        <td className="dashboard-table-name">{q.title || "—"}</td>
                        <td>{q.view_count ?? 0}</td>
                        <td>{q.unique_viewers ?? 0}</td>
                        <td>{q.avg_time_on_page_sec != null ? `${q.avg_time_on_page_sec} с` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
