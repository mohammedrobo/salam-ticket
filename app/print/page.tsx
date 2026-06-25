'use client';

import { useEffect, useRef } from 'react';

export default function PrintPage() {
  const qrRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Auto-open print dialog after QR loads
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
      {/* Screen view */}
      <div className="screen-view">
        <div className="print-controls no-print">
          <button
            onClick={() => window.print()}
            className="print-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print QR Code
          </button>
          <a href="/" className="back-link">
            ← Back to Dashboard
          </a>
        </div>
      </div>

      {/* Print content */}
      <div className="print-content">
        <div className="qr-wrapper">
          <img
            ref={qrRef}
            src="/api/qr"
            alt="Driver check-in QR code"
            className="qr-image"
          />
        </div>
        <p className="print-text">Scan to Check In</p>
        <p className="print-subtext">Point your camera at the QR code</p>
      </div>
    </div>
  );
}