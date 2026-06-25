'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PrintContent() {
  const searchParams = useSearchParams();
  const office = searchParams.get('office') || 'QCA2';
  const qrRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = qrRef.current;
    if (!img) return;

    const handleLoad = () => {
      setTimeout(() => window.print(), 500);
    };

    if (img.complete) {
      handleLoad();
    } else {
      img.addEventListener('load', handleLoad, { once: true });
    }

    return () => img.removeEventListener('load', handleLoad);
  }, []);

  return (
    <div className="print-page">
      <div className="screen-view">
        <div className="print-controls no-print">
          <button onClick={() => window.print()} className="print-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" 
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" 
                 strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print QR Code
          </button>
          <a href={`/?office=${office}`} className="back-link">
            ← Back to Dashboard
          </a>
        </div>
      </div>

      <div className="print-content">
        <div className="qr-wrapper">
          <img
            ref={qrRef}
            src={`/api/qr?office=${office}`}
            alt={`${office} check-in QR code`}
            className="qr-image"
          />
        </div>
        <p className="print-text">Scan to Check In</p>
        <p className="print-subtext">{office} — Point your camera at the QR code</p>
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={
      <div className="print-page flex items-center justify-center">
        <div className="shimmer w-48 h-8 rounded-lg" />
      </div>
    }>
      <PrintContent />
    </Suspense>
  );
}
