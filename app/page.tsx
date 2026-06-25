'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';

interface Driver {
  id: number;
  name: string;
  scanned_at: string;
  status: string;
}

const DriverCard = memo(function DriverCard({
  driver,
  isDeleting,
  onDelete,
}: {
  driver: Driver;
  isDeleting: boolean;
  onDelete: (id: number) => void;
}) {
  const initials = driver.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const scannedDate = new Date(driver.scanned_at + 'Z');
  const time = scannedDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const now = Date.now();
  const diffMs = now - scannedDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  let timeAgo: string;
  if (diffMins < 1) {
    timeAgo = 'Just now';
  } else if (diffMins < 60) {
    timeAgo = `${diffMins}m ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    timeAgo = diffHours < 24 ? `${diffHours}h ago` : `${Math.floor(diffHours / 24)}d ago`;
  }

  return (
    <div
      className={`driver-card flex items-center gap-4 ${
        isDeleting ? 'opacity-0 scale-[0.98]' : ''
      }`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-blue-dim)] flex items-center justify-center shrink-0 shadow-md">
        <span className="font-display text-xs font-semibold text-white leading-none tracking-wide">
          {initials}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-[15px] font-medium truncate leading-tight tracking-tight">
          {driver.name}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="time-badge text-[var(--text-muted)] text-[11px] flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {time}
          </span>
          <span className="text-[var(--text-ghost)] text-[10px]">·</span>
          <span className="text-[var(--accent-amber)] text-[11px] font-medium">
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={() => onDelete(driver.id)}
        disabled={isDeleting}
        className="btn-danger px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {isDeleting ? '...' : 'Done'}
      </button>
    </div>
  );
});

const SkeletonCard = memo(function SkeletonCard() {
  return <div className="shimmer h-[72px] rounded-xl" />;
});

export default function Dashboard() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const deletingRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);
  const qrRef = useRef<string>('/api/qr');

  useEffect(() => {
    qrRef.current = `/api/qr?t=${Date.now()}`;
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch('/api/drivers');
      const data = await res.json();
      setDrivers(data);
    } catch {
      // retry on next interval
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 3000);
    return () => clearInterval(interval);
  }, [fetchDrivers]);

  const handleDelete = useCallback(async (id: number) => {
    deletingRef.current = id;
    forceRender((n) => n + 1);

    await new Promise((r) => setTimeout(r, 200));

    try {
      await fetch(`/api/drivers?id=${id}`, { method: 'DELETE' });
      setDrivers((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // retry on next interval
    } finally {
      deletingRef.current = null;
      forceRender((n) => n + 1);
    }
  }, []);

  const handleRefreshQr = useCallback(() => {
    qrRef.current = `/api/qr?t=${Date.now()}`;
    forceRender((n) => n + 1);
  }, []);

  return (
    <div className="min-h-screen mesh-gradient flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.03]">
        <div className="max-w-5xl mx-auto px-5 py-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            {/* Brand */}
            <div className="animate-fade-in-up">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-blue-dim)] flex items-center justify-center shrink-0 shadow-md">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <div>
                  <h1 className="font-display text-[17px] font-semibold tracking-tight leading-none">
                    Fleet Manager
                  </h1>
                  <p className="text-[var(--text-ghost)] text-[11px] mt-0.5 tracking-wide">
                    DRIVER CHECK-IN
                  </p>
                </div>
              </div>
            </div>

            {/* QR Card */}
            <div className="glass rounded-xl p-2.5 flex items-center gap-3 animate-fade-in-up delay-2">
              <div className="qr-container">
                <img
                  src={qrRef.current}
                  alt="Driver check-in QR code"
                  className="w-20 h-20"
                />
              </div>
              <div className="pr-1">
                <p className="font-display text-[13px] font-medium text-[var(--text-primary)] mb-0.5">
                  Scan to Check In
                </p>
                <p className="text-[var(--text-ghost)] text-[11px] mb-2">
                  Point camera at QR
                </p>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleRefreshQr}
                    className="text-[11px] text-[var(--accent-blue)] hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-500">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                    Refresh
                  </button>
                  <span className="text-[var(--text-ghost)]">·</span>
                  <a
                    href="/print"
                    target="_blank"
                    className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Print
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-5 py-5 flex-1 w-full">
        {/* Stats */}
        <div className="flex items-center gap-3 mb-5 animate-fade-in-up delay-3">
          <div className="glass rounded-lg px-3.5 py-2 flex items-center gap-2">
            <div className="status-dot bg-[var(--accent-emerald)]"></div>
            <span className="text-[var(--text-ghost)] text-[11px] uppercase tracking-wider">Active</span>
            <span className="font-display text-base font-semibold tabular-nums leading-none">
              {drivers.length}
            </span>
          </div>
          <div className="glass rounded-lg px-3.5 py-2 flex items-center gap-2">
            <div className="status-dot bg-[var(--accent-emerald)]"></div>
            <span className="text-[var(--text-ghost)] text-[11px] uppercase tracking-wider">System</span>
            <span className="text-[11px] font-medium text-[var(--accent-emerald)]">Online</span>
          </div>
        </div>

        {/* Driver List */}
        {loading ? (
          <div className="space-y-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : drivers.length === 0 ? (
          <div className="empty-state py-16 text-center animate-fade-in-up">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[var(--accent-blue)]/[0.04] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <h2 className="font-display text-base font-medium text-[var(--text-secondary)] mb-1">
              No Drivers Waiting
            </h2>
            <p className="text-[var(--text-ghost)] text-[13px] max-w-[220px] mx-auto leading-relaxed">
              Drivers will appear after scanning the QR code
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {drivers.map((driver, index) => (
              <div
                key={driver.id}
                style={{
                  animationDelay: `${index * 0.05}s`,
                  animation: 'fadeInUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                }}
              >
                <DriverCard
                  driver={driver}
                  isDeleting={deletingRef.current === driver.id}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.03]">
        <div className="max-w-5xl mx-auto px-5 py-3">
          <p className="text-[var(--text-ghost)] text-[11px] text-center tracking-wide">
            Fleet Management · Auto-refreshes every 3s
          </p>
        </div>
      </footer>
    </div>
  );
}