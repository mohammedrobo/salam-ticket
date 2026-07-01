'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { type Driver } from '@/lib/types';
import DriverCard from '@/components/DriverCard';
import SkeletonCard from '@/components/SkeletonCard';
import { CountBadge } from '@/components/Badge';
import CommandBar from '@/components/CommandBar';

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

  const totalActive = waiting.length + onBreak.length + completed.length;

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
      {/* Command Bar */}
      <CommandBar
        label="Fleet Ops"
        office={office}
        showHeartbeat
        isArabic={isArabic}
      >
        <a
          href={`/qr?office=${office}`}
          target="_blank"
          className="command-signout ripple-container"
          style={{ textDecoration: 'none' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span>{isArabic ? 'رمز QR' : 'QR Code'}</span>
        </a>

        <button
          onClick={() => router.push('/analytics')}
          className="command-signout ripple-container"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>{isArabic ? 'التحليلات' : 'Analytics'}</span>
        </button>
      </CommandBar>

      {/* Main content */}
      <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col gap-12 p-8 relative z-10">
        {/* Driver List */}
        <div className="driver-list-panel flex-1 bg-[var(--bg-surface)]/40 rounded-3xl border border-[var(--border-subtle)] backdrop-blur-md p-8">
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
