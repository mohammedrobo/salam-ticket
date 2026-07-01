'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface CommandBarProps {
  label: string;
  office?: string | null;
  showHeartbeat?: boolean;
  backTo?: string;
  backLabel?: string;
  showSignOut?: boolean;
  isArabic?: boolean;
  children?: React.ReactNode;
}

export default function CommandBar({
  label,
  office,
  showHeartbeat = false,
  backTo,
  backLabel = 'Back',
  showSignOut = true,
  isArabic = false,
  children,
}: CommandBarProps) {
  const router = useRouter();

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

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleBack = () => {
    if (backTo) {
      router.push(backTo);
    } else {
      router.back();
    }
  };

  return (
    <header className="command-bar">
      <div className="command-bar-inner">
        <div className="command-wordmark animate-fade-in-up">
          <span className="command-wordmark-name">Salam</span>
          <span className="command-wordmark-label">{label}</span>
        </div>

        <div className="command-actions animate-fade-in-up delay-2">
          {office && (
            <div className="command-office">
              <span className="command-office-dot" />
              <span>{office}</span>
            </div>
          )}

          {backTo && (
            <button onClick={handleBack} className="command-signout ripple-container">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>{backLabel}</span>
            </button>
          )}

          {children}

          {showSignOut && (
            <button
              onClick={handleSignOut}
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
          )}

          {showHeartbeat && (
            <div className="command-heartbeat">
              <span className="command-heartbeat-dot" />
              <span className="command-heartbeat-label">{isArabic ? ' متصل' : 'Online'}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
