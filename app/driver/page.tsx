'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import AnimatedCounter from '@/components/AnimatedCounter';

interface DeliveryRecord {
  id: string;
  office_id: string;
  scanned_at: string;
  completed_at: string;
  duration_seconds: number;
}

interface DriverAccount {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
}

interface DriverProfile {
  account: DriverAccount;
  total_deliveries: number;
  deliveries_this_week: number;
  deliveries_this_month: number;
  last_delivery: string | null;
  recent_deliveries: DeliveryRecord[];
  daily_counts: { date: string; count: number }[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPerformanceBadge(avgSeconds: number): { label: string; cls: string } | null {
  if (avgSeconds <= 0) return null;
  const mins = avgSeconds / 60;
  if (mins < 8) return { label: 'Fast', cls: 'driver-perf-fast' };
  if (mins < 15) return { label: 'Average', cls: 'driver-perf-medium' };
  return { label: 'Slow', cls: 'driver-perf-slow' };
}

function buildHeatmapWeeks(
  dailyCounts: { date: string; count: number }[]
): { date: string; count: number; level: number }[][] {
  if (dailyCounts.length === 0) return [];

  const countMap = new Map(dailyCounts.map((d) => [d.date, d.count]));
  const maxCount = Math.max(1, ...dailyCounts.map((d) => d.count));

  const today = new Date();
  const totalDays = 84;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - totalDays + 1);

  const allDays: { date: string; count: number; level: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const count = countMap.get(dateStr) || 0;
    const level = count === 0 ? 0 : count <= maxCount * 0.25 ? 1 : count <= maxCount * 0.5 ? 2 : count <= maxCount * 0.75 ? 3 : 4;
    allDays.push({ date: dateStr, count, level });
  }

  const weeks: { date: string; count: number; level: number }[][] = [];
  let currentWeek: typeof allDays = [];

  const firstDayOfWeek = startDate.getDay();
  const padDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  for (let i = 0; i < padDays; i++) {
    currentWeek.push({ date: '', count: 0, level: -1 });
  }

  for (const day of allDays) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', count: 0, level: -1 });
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

function DriverProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const accountId = searchParams.get('id');
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accountId) {
      setError('No driver ID provided'); // eslint-disable-line react-hooks/set-state-in-effect -- initialization
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/driver/${accountId}`);
        if (!res.ok) {
          setError('Driver not found');
          return;
        }
        const data = await res.json();
        setProfile(data);
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [accountId]);

  const heatmapWeeks = useMemo(() => {
    if (!profile) return [];
    return buildHeatmapWeeks(profile.daily_counts);
  }, [profile]);

  const perfBadge = useMemo(() => {
    if (!profile || profile.total_deliveries === 0) return null;
    const avg = Math.round(
      profile.recent_deliveries.reduce((s, d) => s + d.duration_seconds, 0) /
        Math.max(1, profile.recent_deliveries.length)
    );
    return getPerformanceBadge(avg);
  }, [profile]);

  const sparklineDays = useMemo(() => {
    if (!profile) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 13);
    cutoff.setHours(0, 0, 0, 0);
    return profile.daily_counts
      .filter((d) => new Date(d.date) >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [profile]);

  const maxSparkline = useMemo(() => {
    if (!profile) return 1;
    return Math.max(1, ...profile.daily_counts.map((d) => d.count));
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="shimmer w-48 h-8 rounded-lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] text-lg">{error || 'Driver not found'}</p>
        </div>
      </div>
    );
  }

  const { account } = profile;
  const memberSince = new Date(account.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const lastActive = profile.last_delivery
    ? timeAgo(profile.last_delivery)
    : 'Never';

  return (
    <div className="min-h-screen mesh-gradient">
      <header className="command-bar">
        <div className="command-bar-inner">
          <div className="command-wordmark animate-fade-in-up">
            <span className="command-wordmark-name">Salam</span>
            <span className="command-wordmark-label">Driver Profile</span>
          </div>
          <div className="command-actions animate-fade-in-up delay-2">
            <button
              onClick={() => router.back()}
              className="command-signout ripple-container"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Hero Header */}
        <div className="profile-hero animate-fade-in-up">
          <div className="profile-hero-avatar-wrap">
            <div className="profile-hero-avatar">
              <span>
                {account.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="profile-hero-avatar-glow" />
          </div>
          <div className="profile-hero-info">
            <h1 className="profile-hero-name">{account.full_name}</h1>
            <p className="profile-hero-meta">
              {account.phone}
            </p>
            <div className="profile-hero-details">
              <span className="profile-hero-detail">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Since {memberSince}
              </span>
              <span className="profile-hero-dot" />
              <span className="profile-hero-detail">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Active {lastActive}
              </span>
              {perfBadge && (
                <>
                  <span className="profile-hero-dot" />
                  <span className={`driver-perf-badge ${perfBadge.cls}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    {perfBadge.label}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="driver-stats-row animate-fade-in-up delay-1">
          <div className="driver-stat-card profile-stat-card">
            <div className="profile-stat-icon profile-stat-emerald">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p className="driver-stat-label">Total Deliveries</p>
            <p className="driver-stat-number driver-stat-emerald">
              <AnimatedCounter value={profile.total_deliveries} />
            </p>
          </div>
          <div className="driver-stat-card profile-stat-card">
            <div className="profile-stat-icon profile-stat-blue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 5v14" />
                <path d="M18 5v14" />
                <path d="M6 12h12" />
              </svg>
            </div>
            <p className="driver-stat-label">This Week</p>
            <p className="driver-stat-number driver-stat-blue">
              <AnimatedCounter value={profile.deliveries_this_week} />
            </p>
          </div>
          <div className="driver-stat-card profile-stat-card">
            <div className="profile-stat-icon profile-stat-amber">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="driver-stat-label">This Month</p>
            <p className="driver-stat-number driver-stat-amber">
              <AnimatedCounter value={profile.deliveries_this_month} />
            </p>
          </div>
        </div>

        {/* 14-Day Trend Sparkline */}
        {sparklineDays.length > 0 && (
          <div className="driver-sparkline-row animate-fade-in-up delay-2">
            <span className="driver-sparkline-label">14d Trend</span>
            <div className="driver-sparkline-bars">
              {sparklineDays.map((day) => (
                <div
                  key={day.date}
                  className="driver-sparkline-bar"
                  style={{ height: `${maxSparkline > 0 ? (day.count / maxSparkline) * 100 : 0}%` }}
                  title={`${day.date}: ${day.count}`}
                />
              ))}
            </div>
            <span className="driver-sparkline-value">
              {sparklineDays.reduce((s, d) => s + d.count, 0)}
            </span>
          </div>
        )}

        {/* Activity Heatmap */}
        {heatmapWeeks.length > 0 && (
          <div className="driver-heatmap-section animate-fade-in-up delay-2">
            <h2 className="driver-heatmap-title">Activity (12 weeks)</h2>
            <div className="driver-heatmap-grid">
              {heatmapWeeks.map((week, wi) => (
                <div key={wi} className="driver-heatmap-week">
                  {week.map((day, di) =>
                    day.level === -1 ? (
                      <div key={di} className="driver-heatmap-cell" style={{ visibility: 'hidden' }} />
                    ) : (
                      <div
                        key={di}
                        className="driver-heatmap-cell"
                        data-level={day.level}
                      >
                        {day.date && (
                          <div className="driver-heatmap-tooltip">
                            {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}: {day.count} {day.count === 1 ? 'delivery' : 'deliveries'}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
            <div className="driver-heatmap-legend">
              <span>Less</span>
              <div className="driver-heatmap-legend-cell" data-level="0" style={{ background: 'rgba(255,255,255,0.03)' }} />
              <div className="driver-heatmap-legend-cell" data-level="1" style={{ background: 'rgba(52, 211, 153, 0.15)' }} />
              <div className="driver-heatmap-legend-cell" data-level="2" style={{ background: 'rgba(52, 211, 153, 0.3)' }} />
              <div className="driver-heatmap-legend-cell" data-level="3" style={{ background: 'rgba(52, 211, 153, 0.5)' }} />
              <div className="driver-heatmap-legend-cell" data-level="4" style={{ background: 'rgba(52, 211, 153, 0.75)' }} />
              <span>More</span>
            </div>
          </div>
        )}

        {/* Recent Deliveries */}
        <div className="driver-section animate-fade-in-up delay-3">
          <h2 className="driver-section-title">Recent Deliveries</h2>
          {profile.recent_deliveries.length === 0 ? (
            <div className="profile-empty-state">
              <div className="profile-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-ghost)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <p className="driver-empty-text">No deliveries yet</p>
            </div>
          ) : (
            <div className="driver-delivery-list">
              {profile.recent_deliveries.map((delivery, i) => (
                <div
                  key={delivery.id}
                  className="driver-delivery-row analytics-stagger-item"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="driver-delivery-left">
                    <span className="driver-delivery-date">
                      {new Date(delivery.completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="driver-delivery-office">{delivery.office_id}</span>
                  </div>
                  <div className="driver-delivery-right">
                    <span className="driver-delivery-duration">
                      {formatDuration(delivery.duration_seconds)}
                    </span>
                    <span className="driver-delivery-ago">{timeAgo(delivery.completed_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DriverProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="shimmer w-48 h-8 rounded-lg" />
      </div>
    }>
      <DriverProfileContent />
    </Suspense>
  );
}
