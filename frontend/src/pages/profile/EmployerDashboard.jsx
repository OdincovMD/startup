/**
 * Дашборд представителя: сводка (KPI), графики по дням и по типам контента, таблицы по вакансиям/лабораториям/запросам.
 */
import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
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
} from "recharts";
import { apiRequest } from "../../api/client";

const COLORS = { vacancy: "#8884d8", laboratory: "#82ca9d", query: "#ffc658" };
const PIE_COLORS = [COLORS.vacancy, COLORS.laboratory, COLORS.query];

export default function EmployerDashboard({ onError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="profile-form">
        <div className="lab-tab-header">
          <p className="lab-tab-desc">Сводка по вакансиям, лабораториям и запросам: просмотры, отклики и графики за 30 дней.</p>
        </div>
        <p className="muted">Загрузка дашборда…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="profile-form">
        <div className="lab-tab-header">
          <p className="lab-tab-desc">Сводка по вакансиям, лабораториям и запросам.</p>
        </div>
        <p className="muted">Не удалось загрузить данные. Проверьте доступ к аналитике.</p>
      </div>
    );
  }

  const { summary, by_vacancy = [], by_laboratory = [], by_query = [], views_over_time = [], responses_over_time = [] } = data;
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

  return (
    <div className="profile-form dashboard-page">
      <div className="lab-tab-header">
        <p className="lab-tab-desc">Сводка по вакансиям, лабораториям и запросам: просмотры, отклики и графики за последние 30 дней.</p>
      </div>

      {summary && (
        <div className="profile-form-group dashboard-summary">
          <div className="profile-form-group-title">Вакансии и отклики</div>
          <p className="profile-field-hint">Ключевые показатели по опубликованным вакансиям. Наведите курсор на карточку — появится подсказка.</p>
          <div className="dashboard-metrics">
            <div className="dashboard-metric" title="Число вакансий, которые сейчас опубликованы и видны соискателям">
              <span className="dashboard-metric-value">{summary.total_vacancies_published ?? 0}</span>
              <span className="dashboard-metric-label">Опубликовано вакансий</span>
            </div>
            <div className="dashboard-metric" title="Общее количество откликов соискателей на все ваши вакансии">
              <span className="dashboard-metric-value">{summary.total_responses ?? 0}</span>
              <span className="dashboard-metric-label">Всего откликов</span>
            </div>
            <div className="dashboard-metric" title="Отклики со статусом «Новый» — ещё не рассмотрены">
              <span className="dashboard-metric-value">{summary.new_count ?? 0}</span>
              <span className="dashboard-metric-label">Новых</span>
            </div>
            <div className="dashboard-metric" title="Отклики, которые вы приняли">
              <span className="dashboard-metric-value">{summary.accepted_count ?? 0}</span>
              <span className="dashboard-metric-label">Принято</span>
            </div>
            <div className="dashboard-metric" title="Отклики, которые вы отклонили">
              <span className="dashboard-metric-value">{summary.rejected_count ?? 0}</span>
              <span className="dashboard-metric-label">Отклонено</span>
            </div>
            <div className="dashboard-metric" title="Опубликованные вакансии, на которые пока не было ни одного отклика">
              <span className="dashboard-metric-value">{summary.vacancies_with_zero_responses ?? 0}</span>
              <span className="dashboard-metric-label">Вакансий без откликов</span>
            </div>
            <div className="dashboard-metric" title="Среднее число откликов на одну вакансию (всего откликов ÷ число вакансий)">
              <span className="dashboard-metric-value">{summary.avg_responses_per_vacancy ?? 0}</span>
              <span className="dashboard-metric-label">Ср. откликов на вакансию</span>
            </div>
            {summary.accepted_rate != null && (
              <div className="dashboard-metric" title="Процент принятых среди всех рассмотренных откликов (принято ÷ принято + отклонено)">
                <span className="dashboard-metric-value">{summary.accepted_rate}%</span>
                <span className="dashboard-metric-label">Доля принятых</span>
              </div>
            )}
            {summary.avg_days_to_first_response != null && (
              <div className="dashboard-metric" title="В среднем сколько дней проходит от публикации вакансии до первого отклика">
                <span className="dashboard-metric-value">{summary.avg_days_to_first_response}</span>
                <span className="dashboard-metric-label">Ср. дней до первого отклика</span>
              </div>
            )}
            {summary.avg_days_to_first_acceptance != null && (
              <div className="dashboard-metric" title="В среднем сколько дней от публикации вакансии до первого принятого отклика">
                <span className="dashboard-metric-value">{summary.avg_days_to_first_acceptance}</span>
                <span className="dashboard-metric-label">Ср. дней до первого принятия</span>
              </div>
            )}
          </div>
        </div>
      )}

      {hasCharts && (
        <div className="profile-form-group dashboard-charts">
          <div className="profile-form-group-title">Графики за 30 дней</div>
          <p className="profile-field-hint">Динамика просмотров и откликов по типам контента.</p>
          {viewsChartData.length > 0 && (
            <div className="dashboard-chart-wrap">
              <h4 className="dashboard-chart-title" title="Количество просмотров страниц вакансий, лабораторий и запросов по дням за последние 30 дней">Просмотры по дням</h4>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={viewsChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(v) => v} />
                  <Legend />
                  <Area type="monotone" dataKey="vacancy" name="Вакансии" stroke={COLORS.vacancy} fill={COLORS.vacancy} fillOpacity={0.4} stackId="1" />
                  <Area type="monotone" dataKey="laboratory" name="Лаборатории" stroke={COLORS.laboratory} fill={COLORS.laboratory} fillOpacity={0.4} stackId="1" />
                  <Area type="monotone" dataKey="query" name="Запросы" stroke={COLORS.query} fill={COLORS.query} fillOpacity={0.4} stackId="1" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="dashboard-chart-wrap dashboard-chart-wrap--lines">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={viewsChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(v) => v} />
                    <Legend />
                    <Line type="monotone" dataKey="vacancy" name="Вакансии" stroke={COLORS.vacancy} dot={false} />
                    <Line type="monotone" dataKey="laboratory" name="Лаборатории" stroke={COLORS.laboratory} dot={false} />
                    <Line type="monotone" dataKey="query" name="Запросы" stroke={COLORS.query} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {responses_over_time.length > 0 && (
            <div className="dashboard-chart-wrap">
              <h4 className="dashboard-chart-title" title="В какой день соискатели оставляли отклики на ваши вакансии (за 30 дней)">Отклики на вакансии по дням</h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={responses_over_time} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(v) => v} />
                  <Bar dataKey="count" name="Откликов" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {pieData.length > 0 && (
            <div className="dashboard-chart-wrap dashboard-chart-wrap--pie">
              <h4 className="dashboard-chart-title" title="Как распределены просмотры между вакансиями, лабораториями и запросами за 30 дней">Просмотры по типу контента</h4>
              <ResponsiveContainer width="100%" height={260}>
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
        </div>
      )}

      {!hasAnyContent && (
        <div className="profile-form-group">
          <p className="muted">Добавьте вакансии, лаборатории или запросы и опубликуйте их — здесь появятся статистика и графики.</p>
        </div>
      )}

      {hasAnyContent && (
        <>
          {by_vacancy.length > 0 && (
            <div className="profile-form-group dashboard-tables">
              <div className="profile-form-group-title">Детализация по вакансиям</div>
              <p className="profile-field-hint">Просмотры, уникальные посетители, отклики и конверсия.</p>
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th title="Название вакансии">Название</th>
                      <th title="Сколько раз открывали страницу этой вакансии (без учёта просмотров создателя)">Просмотры</th>
                      <th title="Число уникальных посетителей страницы (по пользователям и сессиям)">Уник. зрители</th>
                      <th title="Количество откликов на эту вакансию">Отклики</th>
                      <th title="Доля откликов от уникальных зрителей: отклики ÷ зрители (в %)">Конверсия</th>
                      <th title="Среднее время на странице вакансии в секундах (по событиям ухода со страницы)">Ср. время (с)</th>
                      <th title="Сколько дней прошло от публикации вакансии до первого отклика">До 1-го отклика (дн.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {by_vacancy.map((v) => (
                      <tr key={v.vacancy_id}>
                        <td>{v.name || "—"}</td>
                        <td>{v.view_count ?? 0}</td>
                        <td>{v.unique_viewers ?? 0}</td>
                        <td>{v.response_count ?? 0}</td>
                        <td>{v.conversion_rate != null ? `${(v.conversion_rate * 100).toFixed(1)}%` : "—"}</td>
                        <td>{v.avg_time_on_page_sec != null ? v.avg_time_on_page_sec : "—"}</td>
                        <td>{v.days_to_first_response != null ? v.days_to_first_response : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {by_laboratory.length > 0 && (
            <div className="profile-form-group dashboard-tables">
              <div className="profile-form-group-title">Детализация по лабораториям</div>
              <p className="profile-field-hint">Просмотры страниц лабораторий и время на странице.</p>
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th title="Название лаборатории">Название</th>
                      <th title="Сколько раз открывали страницу этой лаборатории">Просмотры</th>
                      <th title="Число уникальных посетителей страницы лаборатории">Уник. зрители</th>
                      <th title="Среднее время на странице в секундах">Ср. время (с)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {by_laboratory.map((lab) => (
                      <tr key={lab.laboratory_id}>
                        <td>{lab.name || "—"}</td>
                        <td>{lab.view_count ?? 0}</td>
                        <td>{lab.unique_viewers ?? 0}</td>
                        <td>{lab.avg_time_on_page_sec != null ? lab.avg_time_on_page_sec : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {by_query.length > 0 && (
            <div className="profile-form-group dashboard-tables">
              <div className="profile-form-group-title">Детализация по запросам</div>
              <p className="profile-field-hint">Просмотры страниц запросов и время на странице.</p>
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th title="Название запроса">Название</th>
                      <th title="Сколько раз открывали страницу этого запроса">Просмотры</th>
                      <th title="Число уникальных посетителей страницы запроса">Уник. зрители</th>
                      <th title="Среднее время на странице в секундах">Ср. время (с)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {by_query.map((q) => (
                      <tr key={q.query_id}>
                        <td>{q.title || "—"}</td>
                        <td>{q.view_count ?? 0}</td>
                        <td>{q.unique_viewers ?? 0}</td>
                        <td>{q.avg_time_on_page_sec != null ? q.avg_time_on_page_sec : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
