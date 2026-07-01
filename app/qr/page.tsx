'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

function QRContent() {
  const searchParams = useSearchParams();
  const office = searchParams.get('office') || 'QCA2';
  const [waitingCount, setWaitingCount] = useState<number | null>(null);

  const isArabic = ['QCA1', 'QCA2', 'QCA3'].includes(office);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/drivers');
      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : (data.waiting?.length || 0);
        setWaitingCount(count);
      }
    } catch {
      // retry on next interval
    }
  }, []);

  useEffect(() => {
    fetchCount(); // eslint-disable-line react-hooks/set-state-in-effect -- standard data fetching pattern
    const interval = setInterval(fetchCount, 5000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  const qrUrl = `/api/qr?office=${office}`;

  return (
    <div className="qr-portal">
      {/* Atmospheric background */}
      <div className="qr-portal-bg">
        <div className="qr-portal-grid" />
      </div>

      {/* Main content */}
      <div className="qr-portal-content">

        {/* Header */}
        <header className="qr-portal-header">
          <div className="qr-portal-brand">
            <div className="qr-portal-brand-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <span className="qr-portal-brand-text">Fleet Manager</span>
          </div>
          <a href={`/?office=${office}`} className="qr-portal-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {isArabic ? 'لوحة التحكم' : 'Dashboard'}
          </a>
        </header>

        {/* Office badge */}
        <div className="qr-portal-office-badge">
          <span className="qr-portal-office-dot" />
          <span>{office}</span>
        </div>

        {/* QR Scanner Frame */}
        <div className="qr-portal-scanner">
          <div className="qr-portal-scanner-card">
            {/* Corner brackets */}
            <div className="qr-portal-bracket qr-portal-bracket--tl">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round">
                <path d="M2 8V4a2 2 0 0 1 2-2h4" />
              </svg>
            </div>
            <div className="qr-portal-bracket qr-portal-bracket--tr">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round">
                <path d="M2 8V4a2 2 0 0 1 2-2h4" />
              </svg>
            </div>
            <div className="qr-portal-bracket qr-portal-bracket--br">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round">
                <path d="M2 8V4a2 2 0 0 1 2-2h4" />
              </svg>
            </div>
            <div className="qr-portal-bracket qr-portal-bracket--bl">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round">
                <path d="M2 8V4a2 2 0 0 1 2-2h4" />
              </svg>
            </div>

            {/* QR image */}
            <div className="qr-portal-qr">
              <Image
                src={qrUrl}
                alt={`${office} check-in QR code`}
                className="qr-portal-qr-img"
                width={220}
                height={220}
                unoptimized
              />
            </div>

            {/* Scan line */}
            <div className="qr-portal-scanline" />
          </div>
        </div>

        {/* Instructions */}
        <div className="qr-portal-instructions">
          <h1 className="qr-portal-title">
            {isArabic ? (
              <>امسح <span className="qr-portal-title-accent">للتسجيل</span></>
            ) : (
              <>Scan <span className="qr-portal-title-accent">to Check In</span></>
            )}
          </h1>
          <p className="qr-portal-subtitle">
            {isArabic
              ? 'وجّه كاميرا هاتفك نحو رمز QR'
              : 'Point your phone camera at the code'}
          </p>
        </div>

        {/* Live queue count */}
        {waitingCount !== null && (
          <div className="qr-portal-stat">
            <div className="qr-portal-stat-dot" />
            <span className="qr-portal-stat-value">{waitingCount}</span>
            <span className="qr-portal-stat-label">
              {isArabic ? 'في الطابور' : 'waiting'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="qr-portal-actions">
          <a
            href={`/print?office=${office}`}
            target="_blank"
            className="qr-portal-btn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            {isArabic ? 'طباعة' : 'Print'}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function QRPage() {
  return (
    <Suspense fallback={
      <div className="qr-portal flex items-center justify-center">
        <div className="shimmer w-48 h-8 rounded-lg" />
      </div>
    }>
      <QRContent />
    </Suspense>
  );
}
