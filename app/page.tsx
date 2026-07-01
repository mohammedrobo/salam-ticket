'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { type Driver } from '@/lib/types';
import DriverCard from '@/components/DriverCard';
import SkeletonCard from '@/components/SkeletonCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { CountBadge } from '@/components/Badge';

export default function Dashboard() {
  const [waiting, setWaiting] = useState<Driver[]>([]);
  const [onBreak, setOnBreak] = useState<Driver[]>([]);
  const [completed, setCompleted] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [office, setOffice] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const [exitingIds, setExitingIds] = useState<Set<number>>(new Set());

  const isArabic = office ? ['QCA1', 'QCA2', 'QCA3'].includes(office) : false;

  const qrUrl = useMemo(
    () => office ? `/api/qr?office=${office}` : '/api/qr',
    [office]
  );

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

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch('/api/drivers?include_completed=true');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setWaiting(data);
        setOnBreak([]);
        setCompleted([]);
      } else {
        setWaiting(data.waiting || []);
        setOnBreak(data.on_break || []);
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
    fetchDrivers(); // eslint-disable-line react-hooks/set-state-in-effect -- standard data fetching pattern
    const interval = setInterval(fetchDrivers, 3000);
    return () => clearInterval(interval);
  }, [fetchDrivers, office]);

  const [completingId, setCompletingId] = useState<number | null>(null);

  const handleDone = useCallback(async (driverId: number) => {
    setCompletingId(driverId);
    setExitingIds((prev) => new Set(prev).add(driverId));

    setTimeout(async () => {
      try {
        await fetch(`/api/drivers?id=${driverId}`, { method: 'DELETE' });
        fetchDrivers();
      } catch {
        // retry on next interval
      } finally {
        setCompletingId(null);
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(driverId);
          return next;
        });
      }
    }, 500);
  }, [fetchDrivers]);

  const handleBreak = useCallback(async (driverId: number) => {
    try {
      await fetch('/api/drivers/break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId }),
      });
      fetchDrivers();
    } catch {
      // retry on next interval
    }
  }, [fetchDrivers]);

  const handleRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, []);

  const totalActive = waiting.length + onBreak.length + completed.length;

  if (!authChecked) {
    return (
      <div className="min-h-screen mesh-gradient mesh-gradient-animated flex items-center justify-center">
        <div className="shimmer w-48 h-8 rounded-lg" />
      </div>
    );
  }

  if (!office) return null;

  return (
    <div className="min-h-screen mesh-gradient mesh-gradient-animated flex flex-col">
      {/* Command Bar */}
      <header className="command-bar">
        <div className="command-bar-inner">
          <div className="command-wordmark animate-fade-in-up">
            <span className="command-wordmark-name">Salam</span>
            <span className="command-wordmark-label">Fleet Ops</span>
          </div>

          <div className="command-actions animate-fade-in-up delay-2">
            <div className="command-office">
              <span className="command-office-dot" />
              <span>{office}</span>
            </div>

            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              }}
              className="command-signout ripple-container"
              onClickCapture={handleRipple}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{isArabic ? 'خروج' : 'Sign Out'}</span>
            </button>

            <div className="command-heartbeat">
              <span className="command-heartbeat-dot" />
              <span className="command-heartbeat-label">{isArabic ? ' متصل' : 'Online'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col lg:flex-row gap-12 p-8 relative z-10">
        {/* LEFT: QR Panel */}
        <div className="qr-panel rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-surface)] border border-[var(--border-subtle)] animate-slide-left relative">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--accent-blue-glow)] rounded-full blur-[100px] pointer-events-none" />
          <div className="qr-display animate-scale-in">
            <img
              src={qrUrl}
              alt={`${office} check-in QR code`}
            />
          </div>

          <div className="qr-label animate-fade-in-up delay-2 mt-4 relative z-10">
            <h2 className="text-[var(--text-3xl)] font-display uppercase tracking-[-0.04em] font-800">Scan to Check In</h2>
            <p className="text-[var(--text-lg)] opacity-70 mt-2">Point your camera at the QR code</p>
          </div>

          <div className="qr-actions animate-fade-in-up delay-3">
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

          <div className="flex items-center gap-12 mt-8 p-6 glass rounded-2xl animate-fade-in-up delay-4 relative z-10">
            <div className="text-left">
              <p className="text-[var(--text-ghost)] text-[var(--text-xs)] uppercase tracking-[0.2em] font-bold mb-2">
                {isArabic ? 'في الطابور' : 'In Queue'}
              </p>
              <p className="font-display text-[var(--text-5xl)] font-800 tracking-[-0.05em] leading-none text-[var(--text-primary)]">
                <AnimatedCounter value={waiting.length} />
              </p>
            </div>
            <div className="w-px h-16 bg-[var(--border-subtle)]" />
            <div className="text-left">
              <p className="text-[var(--text-ghost)] text-[var(--text-xs)] uppercase tracking-[0.2em] font-bold mb-2">
                {isArabic ? 'تم اليوم' : 'Done Today'}
              </p>
              <p className="font-display text-[var(--text-5xl)] font-800 tracking-[-0.05em] leading-none text-[var(--accent-emerald)]">
                <AnimatedCounter value={completed.length} />
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Driver List */}
        <div className="driver-list-panel flex-1 bg-[var(--bg-surface)]/40 rounded-3xl border border-[var(--border-subtle)] backdrop-blur-md">
          <div className="driver-list-header animate-fade-in-up delay-1 border-b border-[var(--border-subtle)] pb-8 mb-8">
            <h2 className="text-[var(--text-4xl)] uppercase font-900 tracking-[-0.05em]">{isArabic ? 'الطابور' : 'Queue'}</h2>
            <div className="flex items-center gap-3">
              {completed.length > 0 && (
                <CountBadge count={completed.length} type="done" isArabic={isArabic} />
              )}
              {onBreak.length > 0 && (
                <CountBadge count={onBreak.length} type="break" isArabic={isArabic} />
              )}
              <CountBadge count={waiting.length} type="waiting" isArabic={isArabic} />
            </div>
          </div>

          {loading ? (
            <div className="driver-list">
              <SkeletonCard delay={0} />
              <SkeletonCard delay={0.08} />
              <SkeletonCard delay={0.16} />
              <SkeletonCard delay={0.24} />
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
              {waiting.map((driver, index) => (
                <div
                  key={driver.id}
                  className="card-enter"
                  style={{ animationDelay: `${index * 0.06}s`, opacity: 0 }}
                >
                  <DriverCard
                    driver={driver}
                    position={index + 1}
                    isArabic={isArabic}
                    variant={index === 0 ? 'next' : 'waiting'}
                    onDone={() => handleDone(driver.id)}
                    onBreak={index === 0 ? () => handleBreak(driver.id) : undefined}
                    isCompleting={completingId === driver.id}
                    exiting={exitingIds.has(driver.id)}
                  />
                </div>
              ))}

              {onBreak.length > 0 && (
                <>
                  {(waiting.length > 0 || completed.length > 0) && (
                    <div className="driver-section-divider">
                      <div className="driver-section-divider-line" />
                      <span className="driver-section-divider-text driver-section-divider-break">
                        {isArabic ? 'في الاستراحة' : 'On Break'}
                      </span>
                      <div className="driver-section-divider-line" />
                    </div>
                  )}
                  {onBreak.map((driver, index) => (
                    <div
                      key={driver.id}
                      className="card-enter"
                      style={{ animationDelay: `${(waiting.length + index) * 0.06}s`, opacity: 0 }}
                    >
                      <DriverCard
                        driver={driver}
                        position={0}
                        isArabic={isArabic}
                        variant="on_break"
                      />
                    </div>
                  ))}
                </>
              )}

              {completed.length > 0 && (
                <>
                  {(waiting.length > 0 || onBreak.length > 0) && (
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
                      className="card-enter"
                      style={{ animationDelay: `${(waiting.length + onBreak.length + index) * 0.06}s`, opacity: 0 }}
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
