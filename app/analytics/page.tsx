'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import CommandBar from '@/components/CommandBar';

interface DriverAccount {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
}

interface DriverRow {
  account: DriverAccount;
  period_deliveries: number;
  total_deliveries: number;
  avg_duration_seconds: number;
  avg_duration_all_time: number;
  last_delivery: string | null;
  first_delivery: string | null;
}

interface AnalyticsData {
  summary: {
    total_drivers: number;
    period_deliveries: number;
    avg_per_driver: number;
    avg_duration: number;
    first_timers: number;
    busiest_day: { date: string; count: number };
    prev_period_deliveries: number;
    prev_avg_duration: number;
    speed_fast: number;
    speed_medium: number;
    speed_slow: number;
  };
  daily_trend: { date: string; count: number }[];
  top_drivers: { name: string; id: string; deliveries: number }[];
  inactive_drivers: { name: string; id: string; last_seen: string }[];
  drivers: DriverRow[];
}

import AnimatedCounter from '@/components/AnimatedCounter';
import { formatDuration, timeAgo } from '@/lib/utils';

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function getFullDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function computeDelta(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) return { pct: 0, direction: current > 0 ? 'up' : 'flat' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { pct, direction: 'up' };
  if (pct < 0) return { pct: Math.abs(pct), direction: 'down' };
  return { pct: 0, direction: 'flat' };
}

function exportCSV(drivers: DriverRow[]) {
  const headers = ['Rank', 'Name', 'Phone', 'Deliveries', 'All Time', 'Avg Time', 'Best Time', 'Last Seen'];
  const rows = drivers.map((d, i) => [
    i + 1,
    d.account.full_name,
    d.account.phone,
    d.period_deliveries,
    d.total_deliveries,
    d.avg_duration_seconds > 0 ? formatDuration(d.avg_duration_seconds) : '—',
    d.avg_duration_all_time > 0 ? formatDuration(d.avg_duration_all_time) : '—',
    d.last_delivery ? timeAgo(d.last_delivery) : '—',
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drivers-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Period Delta Badge ── */
function PeriodDelta({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0 && current === 0) return null;
  const { pct, direction } = computeDelta(current, previous);
  if (direction === 'flat' && pct === 0) return null;

  const isGood = invert ? direction === 'down' : direction === 'up';
  const cls = isGood
    ? 'analytics-stat-delta analytics-stat-delta-up'
    : direction === 'flat'
      ? 'analytics-stat-delta analytics-stat-delta-flat'
      : 'analytics-stat-delta analytics-stat-delta-down';

  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
  return (
    <span className={cls}>
      {arrow} {pct}%
    </span>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [office, setOffice] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'deliveries' | 'total' | 'duration'>('deliveries');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isArabic = office ? ['QCA1', 'QCA2', 'QCA3'].includes(office) : false;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const d = await res.json();
          setOffice(d.office);
        } else {
          router.push('/login');
          return;
        }
      } catch {
        router.push('/login');
        return;
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [router]);

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const d = await res.json();
      setData(d);
      setLastRefreshed(new Date());
    } catch {
      // retry
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, router]);

  useEffect(() => {
    if (!office) return;
    fetchAnalytics(); // eslint-disable-line react-hooks/set-state-in-effect -- standard data fetching pattern
  }, [fetchAnalytics, office]);

  const filteredDrivers = useMemo(() => {
    if (!data) return [];
    let list = data.drivers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.account.full_name.toLowerCase().includes(q) ||
          d.account.phone.includes(q)
      );
    }
    switch (sortBy) {
      case 'total':
        return [...list].sort((a, b) => b.total_deliveries - a.total_deliveries);
      case 'duration':
        return [...list].sort((a, b) => a.avg_duration_seconds - b.avg_duration_seconds);
      case 'deliveries':
      default:
        return list;
    }
  }, [data, search, sortBy]);

  const maxTrend = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.daily_trend.map((d) => d.count));
  }, [data]);

  const maxTopDriver = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.top_drivers.map((d) => d.deliveries));
  }, [data]);

  const speedTotal = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, data.summary.speed_fast + data.summary.speed_medium + data.summary.speed_slow);
  }, [data]);

  if (!authChecked) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="shimmer w-48 h-8 rounded-lg" />
      </div>
    );
  }

  if (!office) return null;

  return (
    <div className="min-h-screen mesh-gradient">
      {/* Header */}
      {/* Command Bar */}
      <CommandBar
        label="Analytics"
        office={office}
        backTo="/"
        backLabel={isArabic ? 'الطابور' : 'Queue'}
        isArabic={isArabic}
      />

      <div className="max-w-[1400px] mx-auto px-8 py-10">
        {/* Toolbar: Period Tabs + Refresh + CSV + Search */}
        <div className="analytics-toolbar animate-fade-in-up">
          <div className="analytics-period-tabs">
            {(['week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setLoading(true); }}
                className={`analytics-period-tab ${period === p ? 'analytics-period-tab-active' : ''}`}
              >
                {p === 'week' ? (isArabic ? 'أسبوع' : 'Week') : p === 'month' ? (isArabic ? 'شهر' : 'Month') : (isArabic ? 'كل' : 'All Time')}
              </button>
            ))}
          </div>
          <div className="analytics-toolbar-actions">
            {lastRefreshed && (
              <span className="analytics-refresh-time">
                {isArabic ? 'آخر تحديث' : 'Updated'} {timeAgo(lastRefreshed.toISOString())}
              </span>
            )}
            <button
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              className={`analytics-refresh-btn ${refreshing ? 'analytics-refresh-spin' : ''}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              {isArabic ? 'تحديث' : 'Refresh'}
            </button>
            <div className="analytics-toolbar-divider" />
            <button
              onClick={() => data && exportCSV(filteredDrivers)}
              className="analytics-export-btn"
              title={isArabic ? 'تصدير CSV' : 'Export CSV'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              CSV
            </button>
            <div className="analytics-search-wrapper">
              <svg className="analytics-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isArabic ? 'بحث بالاسم...' : 'Search drivers...'}
                className="analytics-search"
              />
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="analytics-stats-grid animate-fade-in-up delay-1">
          <div className="analytics-stat-card">
            <div className="analytics-stat-icon analytics-stat-icon-blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="analytics-stat-content">
              <p className="analytics-stat-value"><AnimatedCounter value={data?.summary.total_drivers ?? 0} className="analytics-counter" /></p>
              <p className="analytics-stat-label">{isArabic ? 'سائق نشط' : 'Active Drivers'}</p>
            </div>
          </div>

          <div className="analytics-stat-card">
            <div className="analytics-stat-icon analytics-stat-icon-emerald">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div className="analytics-stat-content">
              <p className="analytics-stat-value analytics-stat-emerald"><AnimatedCounter value={data?.summary.period_deliveries ?? 0} className="analytics-counter" /></p>
              <p className="analytics-stat-label">{isArabic ? 'توصيلات' : 'Deliveries'}</p>
              {data && period !== 'all' && (
                <PeriodDelta current={data.summary.period_deliveries} previous={data.summary.prev_period_deliveries} />
              )}
            </div>
          </div>

          <div className="analytics-stat-card">
            <div className="analytics-stat-icon analytics-stat-icon-amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
              </svg>
            </div>
            <div className="analytics-stat-content">
              <p className="analytics-stat-value analytics-stat-amber"><AnimatedCounter value={data?.summary.avg_per_driver ?? 0} className="analytics-counter" /></p>
              <p className="analytics-stat-label">{isArabic ? 'متوسط / سائق' : 'Avg / Driver'}</p>
            </div>
          </div>

          <div className="analytics-stat-card">
            <div className="analytics-stat-icon analytics-stat-icon-rose">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="analytics-stat-content">
              <p className="analytics-stat-value">{data?.summary.avg_duration ? formatDuration(data.summary.avg_duration) : '—'}</p>
              <p className="analytics-stat-label">{isArabic ? 'متوسط الوقت' : 'Avg Duration'}</p>
              {data && period !== 'all' && data.summary.prev_avg_duration > 0 && (
                <PeriodDelta current={data.summary.avg_duration} previous={data.summary.prev_avg_duration} invert />
              )}
            </div>
          </div>
        </div>

        {/* Daily Trend + Insights + Speed Row */}
        <div className="analytics-main-row animate-fade-in-up delay-2">
          {/* Left column: chart + speed stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Daily Trend */}
            <div className="analytics-chart-panel">
              <div className="analytics-panel-header">
                <h3 className="analytics-panel-title">{isArabic ? 'توصيلات يومية' : 'Daily Deliveries'}</h3>
                <span className="analytics-panel-badge">{isArabic ? 'آخر ١٤ يوم' : 'Last 14 days'}</span>
              </div>
              {loading ? (
                <div className="analytics-chart-loading"><div className="shimmer w-full h-full rounded-xl" /></div>
              ) : (
                <div className="analytics-bar-chart">
                  {data?.daily_trend.map((day, i) => {
                    const pct = maxTrend > 0 ? Math.round((day.count / maxTrend) * 100) : 0;
                    return (
                      <div
                        key={day.date}
                        className="analytics-bar-col analytics-tooltip-anchor"
                      >
                        <div className="analytics-custom-tooltip">
                          <div className="analytics-tooltip-day">{getFullDayLabel(day.date)}</div>
                          <div className="analytics-tooltip-count">{day.count} {isArabic ? 'توصيلات' : 'deliveries'}</div>
                          <div className="analytics-tooltip-pct">{pct}% {isArabic ? 'من الأعلى' : 'of peak'}</div>
                        </div>
                        <div className="analytics-bar-value">{day.count > 0 ? day.count : ''}</div>
                        <div className="analytics-bar-track">
                          <div
                            className="analytics-bar-fill"
                            style={{
                              height: `${maxTrend > 0 ? (day.count / maxTrend) * 100 : 0}%`,
                              animationDelay: `${i * 0.04}s`,
                            }}
                          />
                        </div>
                        <div className="analytics-bar-label">{getDayLabel(day.date)}</div>
                        <div className="analytics-bar-date">{formatDateShort(day.date)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Speed Distribution */}
            {data && (data.summary.speed_fast + data.summary.speed_medium + data.summary.speed_slow) > 0 && (
              <div className="analytics-speed-panel">
                <div className="analytics-panel-header">
                  <h3 className="analytics-panel-title">{isArabic ? 'توزيع السرعة' : 'Speed Distribution'}</h3>
                </div>
                <div className="analytics-speed-bars">
                  <div
                    className="analytics-speed-fast"
                    style={{ width: `${(data.summary.speed_fast / speedTotal) * 100}%` }}
                  />
                  <div
                    className="analytics-speed-medium"
                    style={{ width: `${(data.summary.speed_medium / speedTotal) * 100}%` }}
                  />
                  <div
                    className="analytics-speed-slow"
                    style={{ width: `${(data.summary.speed_slow / speedTotal) * 100}%` }}
                  />
                </div>
                <div className="analytics-speed-legend">
                  <div className="analytics-speed-legend-item">
                    <span className="analytics-speed-legend-dot analytics-speed-legend-dot-fast" />
                    <span>{isArabic ? 'سريع' : 'Fast'}</span>
                    <span className="analytics-speed-legend-count">{data.summary.speed_fast}</span>
                  </div>
                  <div className="analytics-speed-legend-item">
                    <span className="analytics-speed-legend-dot analytics-speed-legend-dot-medium" />
                    <span>{isArabic ? 'متوسط' : 'Medium'}</span>
                    <span className="analytics-speed-legend-count">{data.summary.speed_medium}</span>
                  </div>
                  <div className="analytics-speed-legend-item">
                    <span className="analytics-speed-legend-dot analytics-speed-legend-dot-slow" />
                    <span>{isArabic ? 'بطيء' : 'Slow'}</span>
                    <span className="analytics-speed-legend-count">{data.summary.speed_slow}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Insights Panel */}
          <div className="analytics-insights-panel">
            <div className="analytics-panel-header">
              <h3 className="analytics-panel-title">{isArabic ? 'رؤى' : 'Insights'}</h3>
            </div>

            {/* First-timers */}
            <div className="analytics-insight-card">
              <div className="analytics-insight-icon analytics-insight-icon-blue">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <div>
                <p className="analytics-insight-value"><AnimatedCounter value={data?.summary.first_timers ?? 0} className="analytics-counter" /></p>
                <p className="analytics-insight-label">{isArabic ? 'سائق جديد' : 'New Drivers'}</p>
              </div>
            </div>

            {/* Busiest Day */}
            <div className="analytics-insight-card">
              <div className="analytics-insight-icon analytics-insight-icon-amber">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div>
                <p className="analytics-insight-value">
                  {data?.summary.busiest_day?.date ? formatDateShort(data.summary.busiest_day.date) : '—'}
                </p>
                <p className="analytics-insight-label">
                  {isArabic ? 'أكثر يوم' : 'Busiest Day'}
                  {data?.summary.busiest_day?.count ? ` (${data.summary.busiest_day.count})` : ''}
                </p>
              </div>
            </div>

            {/* Top Driver */}
            {data?.top_drivers && data.top_drivers.length > 0 && (
              <div className="analytics-insight-card">
                <div className="analytics-insight-icon analytics-insight-icon-emerald">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9Z" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9Z" />
                    <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                </div>
                <div>
                  <p className="analytics-insight-value">{data.top_drivers[0].name}</p>
                  <p className="analytics-insight-label">
                    {isArabic ? 'أفضل سائق' : 'Top Driver'} — {data.top_drivers[0].deliveries} {isArabic ? 'توصيلات' : 'deliveries'}
                  </p>
                </div>
              </div>
            )}

            {/* Inactive Drivers */}
            {data?.inactive_drivers && data.inactive_drivers.length > 0 && (
              <div className="analytics-insight-card analytics-insight-warn">
                <div className="analytics-insight-icon analytics-insight-icon-rose">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <p className="analytics-insight-value">{data.inactive_drivers.length}</p>
                  <p className="analytics-insight-label">{isArabic ? 'سائق غير نشط' : 'Inactive Drivers'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Drivers Leaderboard */}
        {data?.top_drivers && data.top_drivers.length > 0 && (
          <div className="analytics-leaderboard animate-fade-in-up delay-3">
            <div className="analytics-panel-header">
              <h3 className="analytics-panel-title">{isArabic ? 'أفضل السائقين' : 'Top Drivers'}</h3>
            </div>
            <div className="analytics-leaderboard-list">
              {data.top_drivers.map((driver, i) => (
                <div
                  key={driver.id}
                  className="analytics-leaderboard-row analytics-stagger-item"
                  style={{ animationDelay: `${i * 0.06}s` }}
                  onClick={() => router.push(`/analytics/${driver.id}`)}
                >
                  <span className={`analytics-leaderboard-rank ${i === 0 ? 'analytics-rank-gold' : i === 1 ? 'analytics-rank-silver' : i === 2 ? 'analytics-rank-bronze' : ''}`}>
                    {i + 1}
                  </span>
                  <div className="analytics-leaderboard-avatar">
                    {driver.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="analytics-leaderboard-info">
                    <p className="analytics-leaderboard-name">{driver.name}</p>
                    <div className="analytics-leaderboard-bar-track">
                      <div
                        className="analytics-leaderboard-bar-fill"
                        style={{ width: `${maxTopDriver > 0 ? (driver.deliveries / maxTopDriver) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="analytics-leaderboard-count">{driver.deliveries}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Driver Table */}
        <div className="analytics-table-section animate-fade-in-up delay-4">
          <div className="analytics-panel-header">
            <h3 className="analytics-panel-title">{isArabic ? 'كل السائقين' : 'All Drivers'}</h3>
            <div className="analytics-sort-tabs">
              {([
                { key: 'deliveries', label: isArabic ? 'توصيلات' : 'Deliveries' },
                { key: 'total', label: isArabic ? 'الكل' : 'All Time' },
                { key: 'duration', label: isArabic ? 'الأسرع' : 'Fastest' },
              ] as const).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key)}
                  className={`analytics-sort-tab ${sortBy === s.key ? 'analytics-sort-tab-active' : ''}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="analytics-loading">
              <div className="shimmer w-full h-14 rounded-xl mb-3" />
              <div className="shimmer w-full h-14 rounded-xl mb-3" />
              <div className="shimmer w-full h-14 rounded-xl mb-3" />
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="analytics-empty-state">
              <div className="analytics-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
              <p className="analytics-empty-title">{isArabic ? 'لا يوجد نتائج' : 'No drivers found'}</p>
              <p className="analytics-empty-desc">
                {isArabic ? 'جرب البحث بكلمة مختلفة' : 'Try a different search term or change the period'}
              </p>
            </div>
          ) : (
            <div className="analytics-table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th className="analytics-th analytics-th-rank">#</th>
                    <th className="analytics-th analytics-th-name">{isArabic ? 'الاسم' : 'Driver'}</th>
                    <th className="analytics-th analytics-th-center">{isArabic ? 'توصيلات' : 'Deliveries'}</th>
                    <th className="analytics-th analytics-th-center">{isArabic ? 'الكل' : 'All Time'}</th>
                    <th className="analytics-th analytics-th-center">{isArabic ? 'متوسط' : 'Avg Time'}</th>
                    <th className="analytics-th analytics-th-center">{isArabic ? 'الأسرع' : 'Best'}</th>
                    <th className="analytics-th analytics-th-right">{isArabic ? 'آخر ظهور' : 'Last Seen'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((driver, index) => (
                    <tr
                      key={driver.account.id}
                      className="analytics-row analytics-stagger-item"
                      style={{ animationDelay: `${index * 0.03}s` }}
                      onClick={() => router.push(`/analytics/${driver.account.id}`)}
                    >
                      <td className="analytics-td analytics-td-rank">
                        <span className={`analytics-rank ${index < 3 ? 'analytics-rank-top' : ''}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="analytics-td analytics-td-name">
                        <div className="analytics-driver-cell">
                          <div className="analytics-driver-avatar">
                            {driver.account.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="analytics-driver-name">{driver.account.full_name}</p>
                            <p className="analytics-driver-phone">{driver.account.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="analytics-td analytics-td-center">
                        <span className="analytics-count-analytics">{driver.period_deliveries}</span>
                      </td>
                      <td className="analytics-td analytics-td-center">
                        <span className="analytics-count-total">{driver.total_deliveries}</span>
                      </td>
                      <td className="analytics-td analytics-td-center">
                        <span className="analytics-duration">
                          {driver.avg_duration_seconds > 0 ? formatDuration(driver.avg_duration_seconds) : '—'}
                        </span>
                      </td>
                      <td className="analytics-td analytics-td-center">
                        <span className="analytics-best-time">
                          {driver.avg_duration_all_time > 0 ? formatDuration(driver.avg_duration_all_time) : '—'}
                        </span>
                      </td>
                      <td className="analytics-td analytics-td-right">
                        <span className="analytics-last-seen">
                          {driver.last_delivery ? timeAgo(driver.last_delivery) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
