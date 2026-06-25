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
    timeAgo =
      diffHours < 24 ? `${diffHours}h ago` : `${Math.floor(diffHours / 24)}d ago`;
  }

  return (
    <div
      className={`driver-card ${isDeleting ? 'opacity-0 scale-[0.97]' : ''}`}
    >
      {/* Avatar */}
      <div className="avatar">
        <span>{initials}</span>
      </div>

      {/* Info */}
      <div className="info">
        <h3>{driver.name}</h3>
        <div className="meta">
          <span className="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {time}
          </span>
          <span className="meta-item time-ago">
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={() => onDelete(driver.id)}
        disabled={isDeleting}
        className="btn-danger disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {isDeleting ? '...' : 'Done'}
      </button>
    </div>
  );
});

const SkeletonCard = memo(function SkeletonCard() {
  return <div className="shimmer h-[92px]" />;
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
      <header className="border-b border-white/[0.04]">
        <div className="max-w-[1440px] mx-auto px-8 py-5">
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
                <h1 className="font-display text-[22px] font-800 tracking-tight leading-none">
                  Fleet Manager
                </h1>
                <p className="text-[var(--text-muted)] text-[13px] mt-0.5 tracking-widest uppercase font-semibold">
                  Driver Check-In
                </p>
              </div>
            </div>

            {/* Header right — system status */}
            <div className="flex items-center gap-6 animate-fade-in-up delay-2">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-emerald)] relative">
                  <span className="absolute inset-[-5px] rounded-full bg-[var(--accent-emerald)] opacity-30 animate-pulse" />
                </div>
                <span className="text-[var(--text-muted)] text-[13px] font-semibold uppercase tracking-widest">
                  System <span className="text-[var(--accent-emerald)]">Online</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content — two column layout */}
      <div className="max-w-[1440px] mx-auto w-full flex-1 flex flex-col lg:flex-row">
        {/* LEFT: QR Panel */}
        <div className="qr-panel animate-slide-left">
          {/* QR Code */}
          <div className="qr-display animate-scale-in">
            <img
              src={qrRef.current}
              alt="Driver check-in QR code"
            />
          </div>

          {/* Label */}
          <div className="qr-label animate-fade-in-up delay-2">
            <h2>Scan to Check In</h2>
            <p>Point your camera at the QR code</p>
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
              href="/print"
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

          {/* Quick stats in sidebar */}
          <div className="flex items-center gap-6 mt-4 animate-fade-in-up delay-4">
            <div className="text-center">
              <p className="font-display text-[32px] font-800 tracking-tight leading-none text-[var(--text-primary)]">
                {drivers.length}
              </p>
              <p className="text-[var(--text-ghost)] text-[11px] uppercase tracking-widest font-semibold mt-1">
                Active
              </p>
            </div>
            <div className="w-px h-10 bg-[var(--border-subtle)]" />
            <div className="text-center">
              <p className="font-display text-[32px] font-800 tracking-tight leading-none text-[var(--accent-emerald)]">
                {drivers.length > 0 ? '●' : '○'}
              </p>
              <p className="text-[var(--text-ghost)] text-[11px] uppercase tracking-widest font-semibold mt-1">
                Queue
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Driver List */}
        <div className="driver-list-panel flex-1">
          <div className="driver-list-header animate-fade-in-up delay-1">
            <h2>Queue</h2>
            <span className="count">{drivers.length} waiting</span>
          </div>

          {loading ? (
            <div className="driver-list">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : drivers.length === 0 ? (
            <div className="empty-state animate-scale-in">
              <div className="empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <h2>No Drivers Waiting</h2>
              <p>
                Drivers will appear here in real-time after they scan the QR code
                and check in with their name.
              </p>
            </div>
          ) : (
            <div className="driver-list">
              {drivers.map((driver, index) => (
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
                    isDeleting={deletingRef.current === driver.id}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
