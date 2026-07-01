'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import CommandBar from '@/components/CommandBar';
import AnimatedCounter from '@/components/AnimatedCounter';
import { formatDuration, timeAgo, getPerformanceBadge, buildHeatmapWeeks } from '@/lib/utils';

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

export default function DriverAnalyticsDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/driver/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="shimmer w-48 h-8 rounded-lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Driver not found</p>
      </div>
    );
  }

  const { account } = profile;
  const memberSince = new Date(account.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const perfBadge = getPerformanceBadge(
    profile.total_deliveries > 0
      ? Math.round(
          profile.recent_deliveries.reduce((s, d) => s + d.duration_seconds, 0) /
            Math.max(1, profile.recent_deliveries.length)
        )
      : 0
  );

  const heatmapWeeks = buildHeatmapWeeks(profile.daily_counts);
  const maxSparkline = Math.max(1, ...profile.daily_counts.map((d) => d.count));

  // Get last 14 days for sparkline
  const sparklineDays = profile.daily_counts
    .filter((d) => {
      const dt = new Date(d.date);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 13);
      cutoff.setHours(0, 0, 0, 0);
      return dt >= cutoff;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="min-h-screen mesh-gradient">
      {/* Command Bar */}
      <CommandBar
        label="Driver Profile"
        backTo="/analytics"
        showSignOut={false}
      />

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="animate-fade-in-up mb-10">
          <div className="flex items-center gap-5">
            <div className="driver-profile-avatar">
              {account.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="driver-profile-name">{account.full_name}</h1>
              <p className="driver-profile-meta">
                {account.phone} &middot; Member since {memberSince}
              </p>
              {perfBadge && (
                <span className={`driver-perf-badge ${perfBadge.cls}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  {perfBadge.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="driver-stats-row animate-fade-in-up delay-1">
          <div className="driver-stat-card">
            <p className="driver-stat-label">Total Deliveries</p>
            <p className="driver-stat-number driver-stat-emerald"><AnimatedCounter value={profile.total_deliveries} /></p>
          </div>
          <div className="driver-stat-card">
            <p className="driver-stat-label">This Week</p>
            <p className="driver-stat-number driver-stat-blue"><AnimatedCounter value={profile.deliveries_this_week} /></p>
          </div>
          <div className="driver-stat-card">
            <p className="driver-stat-label">This Month</p>
            <p className="driver-stat-number driver-stat-amber"><AnimatedCounter value={profile.deliveries_this_month} /></p>
          </div>
        </div>

        {/* Recent Deliveries */}
        <div className="driver-section animate-fade-in-up delay-2">
          <h2 className="driver-section-title">Recent Deliveries</h2>
          {profile.recent_deliveries.length === 0 ? (
            <p className="driver-empty-text">No deliveries yet</p>
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

        {/* Activity Sparkline (last 14 days) */}
        {sparklineDays.length > 0 && (
          <div className="driver-sparkline-row animate-fade-in-up delay-3">
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
          <div className="driver-heatmap-section animate-fade-in-up delay-3">
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
      </div>
    </div>
  );
}
