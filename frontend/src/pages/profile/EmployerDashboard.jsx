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
import { 
  TrendingUp, 
  Users, 
  Briefcase, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target, 
  Activity, 
  Calendar,
  Zap,
  Info,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart2
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

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
      <Card variant="solid" padding="lg" className="profile-section-card dashboard-page">
        <div className="profile-section-header">
          <h2 className="profile-section-card__title" style={{ margin: 0 }}>Аналитика</h2>
        </div>
        <p className="profile-section-desc">Просмотры, отклики и динамика за 30 дней.</p>
        <div className="profile-empty-state">
          <p className="muted">Загрузка…</p>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card variant="solid" padding="lg" className="profile-section-card dashboard-page">
        <div className="profile-section-header">
          <h2 className="profile-section-card__title" style={{ margin: 0 }}>Аналитика</h2>
        </div>
        <p className="profile-section-desc">Просмотры, отклики и динамика.</p>
        <div className="profile-empty-state">
          <p className="muted">Не удалось загрузить данные.</p>
        </div>
      </Card>
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

  const metricItems = [
    summary && { value: summary.total_vacancies_published ?? 0, label: "Опубликовано", primary: true, icon: <Briefcase size={20} /> },
    summary && { value: summary.total_responses ?? 0, label: "Всего откликов", primary: true, icon: <MessageSquare size={20} /> },
    summary && { value: summary.new_count ?? 0, label: "Новых", icon: <Zap size={18} /> },
    summary && { value: summary.accepted_count ?? 0, label: "Принято", icon: <CheckCircle size={18} /> },
    summary && { value: summary.rejected_count ?? 0, label: "Отклонено", icon: <XCircle size={18} /> },
    summary && { value: summary.vacancies_with_zero_responses ?? 0, label: "Без откликов", icon: <Info size={18} /> },
    summary?.avg_responses_per_vacancy != null && { value: summary.avg_responses_per_vacancy, label: "Ср. откликов", icon: <Activity size={18} /> },
    summary?.accepted_rate != null && { value: `${summary.accepted_rate}%`, label: "Доля принятых", icon: <Target size={18} /> },
    summary?.avg_days_to_first_response != null && { value: summary.avg_days_to_first_response, label: "Дней до 1-го отклика", icon: <Clock size={18} /> },
    summary?.avg_days_to_first_acceptance != null && { value: summary.avg_days_to_first_acceptance, label: "Дней до 1-го принятия", icon: <Calendar size={18} /> },
  ].filter(Boolean);

  return (
    <Card variant="solid" padding="lg" className="profile-section-card dashboard-page">
      <div className="profile-section-header">
        <h2 className="profile-section-card__title" style={{ margin: 0 }}>Аналитика</h2>
        {onNavigateToSubscription && (
          <div className="dashboard-hero-subscription">
            {subscriptionActive && subscriptionExpiresAt ? (
              <>
                <span className="dashboard-hero-subscription-status">Подписка до {new Date(subscriptionExpiresAt).toLocaleDateString("ru-RU")}</span>
                <Button variant="ghost" onClick={onNavigateToSubscription}>
                  Управление →
                </Button>
              </>
            ) : !subscriptionActive && subscription !== null ? (
              <>
                <span className="dashboard-hero-subscription-status">Без подписки</span>
                <Button variant="ghost" onClick={onNavigateToSubscription}>
                  Узнать о подписке →
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>
      <p className="profile-section-desc">
        Просмотры, отклики и динамика по вакансиям, лабораториям и запросам за последние 30 дней.
      </p>

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

      {summary && metricItems.length > 0 && (
        <section className="dashboard-section dashboard-section--metrics">
          <div className="dashboard-section-header">
            <h3 className="dashboard-section-title">Вакансии и отклики</h3>
          </div>
          <div className="dashboard-metrics dashboard-metrics--section">
            {metricItems.map((item, i) => (
              <Card
                key={i}
                variant="elevated"
                padding="none"
                className={item.primary ? "dashboard-metric dashboard-metric--primary" : "dashboard-metric"}
              >
                {item.icon && <div className="dashboard-metric-icon">{item.icon}</div>}
                <span className="dashboard-metric-value">{item.value}</span>
                <span className="dashboard-metric-label">{item.label}</span>
              </Card>
            ))}
          </div>
        </section>
      )}

      {hasCharts && (
        <section className="dashboard-section dashboard-section--charts">
          <div className="dashboard-section-header">
            <h3 className="dashboard-section-title">Динамика за 30 дней</h3>
          </div>
          <div className="dashboard-charts-grid">
            {viewsChartData.length > 0 && (
              <Card variant="elevated" padding="md" className="dashboard-chart-wrap">
                <div className="dashboard-chart-header">
                  <TrendingUp size={16} className="text-accent" />
                  <h4 className="dashboard-chart-title">Просмотры по дням</h4>
                </div>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <AreaChart data={viewsChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }} 
                      axisLine={{ stroke: "var(--border-light)" }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-md)' }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString("ru-RU", { day: 'numeric', month: 'short' })} 
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                    {showSubLineOnViews && (
                      <ReferenceLine x={subscriptionStartDate} stroke="var(--accent)" strokeDasharray="4 4" label={{ value: "Подписка", fill: "var(--accent)", fontSize: 10, position: 'insideTopLeft' }} />
                    )}
                    <Area type="monotone" dataKey="vacancy" name="Вакансии" stroke={COLORS.vacancy} fill={COLORS.vacancy} fillOpacity={0.15} strokeWidth={2} stackId="1" />
                    <Area type="monotone" dataKey="laboratory" name="Лаборатории" stroke={COLORS.laboratory} fill={COLORS.laboratory} fillOpacity={0.15} strokeWidth={2} stackId="1" />
                    <Area type="monotone" dataKey="query" name="Запросы" stroke={COLORS.query} fill={COLORS.query} fillOpacity={0.15} strokeWidth={2} stackId="1" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}
            {responses_over_time.length > 0 && (
              <Card variant="elevated" padding="md" className="dashboard-chart-wrap">
                <div className="dashboard-chart-header">
                  <BarChart2 size={16} className="text-accent" />
                  <h4 className="dashboard-chart-title">Отклики по дням</h4>
                </div>
                <ResponsiveContainer width="100%" height={chartHeightSmall}>
                  <BarChart data={responses_over_time} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }} 
                      axisLine={{ stroke: "var(--border-light)" }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-md)' }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString("ru-RU", { day: 'numeric', month: 'short' })} 
                    />
                    {showSubLineOnResponses && (
                      <ReferenceLine x={subscriptionStartDate} stroke="var(--accent)" strokeDasharray="4 4" />
                    )}
                    <Bar dataKey="count" name="Откликов" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
            {pieData.length > 0 && (
              <Card variant="elevated" padding="md" className="dashboard-chart-wrap dashboard-chart-wrap--pie">
                <div className="dashboard-chart-header">
                  <PieChartIcon size={16} className="text-accent" />
                  <h4 className="dashboard-chart-title">Просмотры по типу</h4>
                </div>
                <ResponsiveContainer width="100%" height={chartHeightSmall}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
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
        <div className="dashboard-details-grid">
          {by_vacancy.length > 0 && (
            <section className="dashboard-section dashboard-section--table">
              <div className="dashboard-section-header">
                <h3 className="dashboard-section-title">Детализация: Вакансии</h3>
              </div>
              <Card variant="elevated" padding="none" className="dashboard-table-card">
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
                          <td className="text-accent font-semibold">{v.conversion_rate != null ? `${(v.conversion_rate * 100).toFixed(1)}%` : "—"}</td>
                          <td className="muted">{v.avg_time_on_page_sec != null ? `${v.avg_time_on_page_sec} с` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          )}
          
          <div className="dashboard-details-row">
            {by_laboratory.length > 0 && (
              <section className="dashboard-section dashboard-section--table">
                <div className="dashboard-section-header">
                  <h3 className="dashboard-section-title">Лаборатории</h3>
                </div>
                <Card variant="elevated" padding="none" className="dashboard-table-card">
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
                            <td className="muted">{lab.avg_time_on_page_sec != null ? `${lab.avg_time_on_page_sec} с` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            )}

            {by_query.length > 0 && (
              <section className="dashboard-section dashboard-section--table">
                <div className="dashboard-section-header">
                  <h3 className="dashboard-section-title">Запросы</h3>
                </div>
                <Card variant="elevated" padding="none" className="dashboard-table-card">
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
                            <td className="muted">{q.avg_time_on_page_sec != null ? `${q.avg_time_on_page_sec} с` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
