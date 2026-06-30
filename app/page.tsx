'use client';

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';

interface Driver {
  id: number;
  name: string;
  scanned_at: string;
  completed_at?: string;
  status: string;
  office_id: string;
}

const DriverCard = memo(function DriverCard({
  driver,
  position,
  isArabic,
  variant,
  onDone,
  isCompleting,
}: {
  driver: Driver;
  position: number;
  isArabic?: boolean;
  variant: 'waiting' | 'next' | 'done';
  onDone?: () => void;
  isCompleting?: boolean;
}) {
  const initials = driver.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const scannedDate = new Date(driver.scanned_at + 'Z');
  const time = scannedDate.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !isArabic,
  });

  const now = Date.now();
  const diffMs = now - scannedDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  let timeAgo: string;
  if (diffMins < 1) {
    timeAgo = isArabic ? 'الآن' : 'Just now';
  } else if (diffMins < 60) {
    timeAgo = isArabic ? `منذ ${diffMins}د` : `${diffMins}m ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      timeAgo = isArabic ? `منذ ${diffHours}س` : `${diffHours}h ago`;
    } else {
      timeAgo = isArabic ? `منذ ${Math.floor(diffHours / 24)}ي` : `${Math.floor(diffHours / 24)}d ago`;
    }
  }

  // How long since completion (for Done cards)
  const completedTimeAgo = useMemo(() => {
    if (!driver.completed_at) return '';
    const completedMs = new Date(driver.completed_at + 'Z').getTime();
    const diffSec = Math.floor((now - completedMs) / 1000);
    if (diffSec < 60) return isArabic ? 'الآن' : 'Just now';
    const mins = Math.floor(diffSec / 60);
    return isArabic ? `منذ ${mins}د` : `${mins}m ago`;
  }, [driver.completed_at, now, isArabic]);

  return (
    <div className={`driver-card ${variant === 'next' ? 'driver-card-next' : ''} ${variant === 'done' ? 'driver-card-done' : ''}`}>
      {/* Position number */}
      <div className={`driver-position ${variant === 'next' ? 'driver-position-next' : ''} ${variant === 'done' ? 'driver-position-done' : ''}`}>
        {variant === 'done' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span>{position}</span>
        )}
      </div>

      {/* Avatar */}
      <div className={`avatar ${variant === 'next' ? 'avatar-next' : ''} ${variant === 'done' ? 'avatar-done' : ''}`}>
        <span>{initials}</span>
      </div>

      {/* Info */}
      <div className="info flex justify-between items-center w-full gap-4">
        <div className="flex-1 min-w-0">
          <h3 className={`truncate mb-1 ${variant === 'done' ? 'text-[var(--text-muted)]' : ''}`}>{driver.name}</h3>
          <div className="meta">
            <span className="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {time}
            </span>
            <span className="meta-item time-ago shrink-0">
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0 flex items-center gap-2">
          {variant === 'next' ? (
            <>
              <div className="driver-badge driver-badge-next">
                <div className="driver-badge-shimmer" />
                <div className="driver-badge-dot driver-badge-dot-pulse" />
                <span>{isArabic ? 'التالي' : 'Next Up'}</span>
              </div>
              <button
                onClick={onDone}
                disabled={isCompleting}
                className="driver-done-btn"
              >
                {isCompleting ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span>{isArabic ? 'تم' : 'Done'}</span>
              </button>
            </>
          ) : variant === 'done' ? (
            <div className="driver-badge driver-badge-done">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{isArabic ? 'تم' : 'Done'}</span>
              {completedTimeAgo && <span className="driver-badge-time">{completedTimeAgo}</span>}
            </div>
          ) : (
            <div className="driver-badge driver-badge-waiting">
              <div className="driver-badge-dot" />
              <span>{isArabic ? 'في الانتظار' : 'Waiting'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const SkeletonCard = memo(function SkeletonCard() {
  return <div className="shimmer h-[92px]" />;
});

export default function Dashboard() {
  const [waiting, setWaiting] = useState<Driver[]>([]);
  const [completed, setCompleted] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [office, setOffice] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [, forceRender] = useState(0);
  const qrRef = useRef<string>('/api/qr');
  const router = useRouter();

  const isArabic = office ? ['QCA1', 'QCA2', 'QCA3'].includes(office) : false;

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setOffice(data.office);
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

  useEffect(() => {
    if (office) {
      qrRef.current = `/api/qr?office=${office}&t=${Date.now()}`;
    }
  }, [office]);

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch('/api/drivers?include_completed=true');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      // New format: { waiting: [...], completed: [...] }
      if (Array.isArray(data)) {
        // Fallback for old format
        setWaiting(data);
        setCompleted([]);
      } else {
        setWaiting(data.waiting || []);
        setCompleted(data.completed || []);
      }
    } catch {
      // retry on next interval
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!office) return;
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 3000);
    return () => clearInterval(interval);
  }, [fetchDrivers, office]);

  const handleRefreshQr = useCallback(() => {
    if (office) {
      qrRef.current = `/api/qr?office=${office}&t=${Date.now()}`;
      forceRender((n) => n + 1);
    }
  }, [office]);

  const [completingId, setCompletingId] = useState<number | null>(null);

  const handleDone = useCallback(async (driverId: number) => {
    setCompletingId(driverId);
    try {
      await fetch(`/api/drivers?id=${driverId}`, { method: 'DELETE' });
      fetchDrivers();
    } catch {
      // retry on next interval
    } finally {
      setCompletingId(null);
    }
  }, [fetchDrivers]);

  const totalActive = waiting.length + completed.length;

  if (!authChecked) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="shimmer w-48 h-8 rounded-lg" />
      </div>
    );
  }

  if (!office) return null;

  return (
    <div className="min-h-screen mesh-gradient flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.04] bg-[var(--bg-elevated)]/50 backdrop-blur-xl relative z-20">
        <div className="max-w-[1600px] mx-auto px-10 py-8">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-4 animate-fade-in-up">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-blue-dim)] flex items-center justify-center shrink-0 shadow-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <div>
                <h1 className="font-display text-[var(--text-2xl)] font-800 tracking-[-0.05em] leading-none uppercase">
                  Fleet Manager
                </h1>
                <p className="text-[var(--accent-blue)] text-[var(--text-xs)] mt-1.5 tracking-[0.2em] uppercase font-bold">
                  Driver Check-In
                </p>
              </div>
            </div>

            {/* Header right — office name + system status */}
            <div className="flex items-center gap-6 animate-fade-in-up delay-2">
              <div className="glass rounded-xl px-5 py-2.5 flex items-center gap-3">
                <span className="font-display text-[var(--text-lg)] font-800 tracking-[-0.02em] text-[var(--text-primary)]">
                  {office}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-emerald)] relative">
                  <span className="absolute inset-[-6px] rounded-full bg-[var(--accent-emerald)] opacity-30 animate-pulse" />
                </div>
                <span className="text-[var(--text-muted)] text-[var(--text-xs)] font-bold uppercase tracking-[0.15em]">
                  System <span className="text-[var(--accent-emerald)]">Online</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col lg:flex-row gap-12 p-8 relative z-10">
        {/* LEFT: QR Panel */}
        <div className="qr-panel rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-surface)] border border-[var(--border-subtle)] animate-slide-left relative">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--accent-blue-glow)] rounded-full blur-[100px] pointer-events-none" />
          {/* QR Code */}
          <div className="qr-display animate-scale-in">
            <img
              src={qrRef.current}
              alt={`${office} check-in QR code`}
            />
          </div>

          {/* Label */}
          <div className="qr-label animate-fade-in-up delay-2 mt-4 relative z-10">
            <h2 className="text-[var(--text-3xl)] font-display uppercase tracking-[-0.04em] font-800">Scan to Check In</h2>
            <p className="text-[var(--text-lg)] opacity-70 mt-2">Point your camera at the QR code</p>
          </div>

          {/* Actions */}
          <div className="qr-actions animate-fade-in-up delay-3">
            <button
              onClick={handleRefreshQr}
              className="qr-action-btn primary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              Refresh
            </button>
            <a
              href={`/print?office=${office}`}
              target="_blank"
              className="qr-action-btn secondary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </a>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-12 mt-8 p-6 glass rounded-2xl animate-fade-in-up delay-4 relative z-10">
            <div className="text-left">
              <p className="text-[var(--text-ghost)] text-[var(--text-xs)] uppercase tracking-[0.2em] font-bold mb-2">
                {isArabic ? 'في الطابور' : 'In Queue'}
              </p>
              <p className="font-display text-[var(--text-5xl)] font-800 tracking-[-0.05em] leading-none text-[var(--text-primary)]">
                {waiting.length}
              </p>
            </div>
            <div className="w-px h-16 bg-[var(--border-subtle)]" />
            <div className="text-left">
              <p className="text-[var(--text-ghost)] text-[var(--text-xs)] uppercase tracking-[0.2em] font-bold mb-2">
                {isArabic ? 'تم اليوم' : 'Done Today'}
              </p>
              <p className="font-display text-[var(--text-5xl)] font-800 tracking-[-0.05em] leading-none text-[var(--accent-emerald)]">
                {completed.length}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Driver List */}
        <div className="driver-list-panel flex-1 bg-[var(--bg-surface)]/40 rounded-3xl border border-[var(--border-subtle)] backdrop-blur-md">
          {/* Queue Header */}
          <div className="driver-list-header animate-fade-in-up delay-1 border-b border-[var(--border-subtle)] pb-8 mb-8">
            <h2 className="text-[var(--text-4xl)] uppercase font-900 tracking-[-0.05em]">{isArabic ? 'الطابور' : 'Queue'}</h2>
            <div className="flex items-center gap-3">
              {completed.length > 0 && (
                <span className="driver-count-badge driver-count-done">
                  {completed.length} {isArabic ? 'تم' : 'done'}
                </span>
              )}
              <span className="driver-count-badge driver-count-waiting">
                {waiting.length} {isArabic ? 'في الانتظار' : 'waiting'}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="driver-list">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : totalActive === 0 ? (
            <div className="empty-state animate-scale-in">
              <div className="empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <h2>{isArabic ? 'لا يوجد سائقين' : 'No Drivers Yet'}</h2>
              <p>
                {isArabic
                  ? 'سيظهر السائقون هنا في الوقت الفعلي بعد مسح رمز QR والتسجيل'
                  : 'Drivers will appear here in real-time after they scan the QR code and check in with their name.'}
              </p>
            </div>
          ) : (
            <div className="driver-list">
              {/* Waiting drivers */}
              {waiting.map((driver, index) => (
                <div
                  key={driver.id}
                  style={{
                    animationDelay: `${index * 0.06}s`,
                    animation: 'fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                    opacity: 0,
                  }}
                >
                  <DriverCard
                    driver={driver}
                    position={index + 1}
                    isArabic={isArabic}
                    variant={index === 0 ? 'next' : 'waiting'}
                    onDone={index === 0 ? () => handleDone(driver.id) : undefined}
                    isCompleting={completingId === driver.id}
                  />
                </div>
              ))}

              {/* Completed drivers section */}
              {completed.length > 0 && (
                <>
                  {waiting.length > 0 && (
                    <div className="driver-section-divider">
                      <div className="driver-section-divider-line" />
                      <span className="driver-section-divider-text">
                        {isArabic ? 'تم الإتمام' : 'Completed'}
                      </span>
                      <div className="driver-section-divider-line" />
                    </div>
                  )}
                  {completed.map((driver, index) => (
                    <div
                      key={driver.id}
                      style={{
                        animationDelay: `${(waiting.length + index) * 0.06}s`,
                        animation: 'fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                        opacity: 0,
                      }}
                    >
                      <DriverCard
                        driver={driver}
                        position={0}
                        isArabic={isArabic}
                        variant="done"
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
