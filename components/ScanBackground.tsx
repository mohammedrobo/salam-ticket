'use client';

import { type ReactNode } from 'react';

type AccentColor = 'blue' | 'green' | 'gold' | 'red';

const orbColors: Record<AccentColor, { primary: string; secondary: string; tertiary?: string }> = {
  blue: {
    primary: 'rgba(77, 141, 255, 0.4)',
    secondary: 'rgba(77, 141, 255, 0.3)',
    tertiary: 'rgba(52, 211, 153, 0.2)',
  },
  green: {
    primary: 'rgba(52, 211, 153, 0.4)',
    secondary: 'rgba(52, 211, 153, 0.3)',
  },
  gold: {
    primary: 'rgba(232, 175, 74, 0.4)',
    secondary: 'rgba(232, 175, 74, 0.3)',
    tertiary: 'rgba(180, 140, 60, 0.2)',
  },
  red: {
    primary: 'rgba(240, 96, 96, 0.4)',
    secondary: 'rgba(240, 96, 96, 0.3)',
  },
};

const glowColors: Record<AccentColor, string> = {
  blue: 'rgba(77, 141, 255, 0.06)',
  green: 'rgba(52, 211, 153, 0.06)',
  gold: 'rgba(232, 175, 74, 0.06)',
  red: 'rgba(240, 96, 96, 0.06)',
};

export default function ScanBackground({
  accent = 'gold',
  grid = false,
  children,
}: {
  accent?: AccentColor;
  grid?: boolean;
  children: ReactNode;
}) {
  const orbs = orbColors[accent];
  const glow = glowColors[accent];

  return (
    <div className="scan-page" style={{ background: 'var(--bg-primary)' }}>
      <div className="scan-bg" />

      <div className="scan-bg-glow" style={{
        background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${glow} 0%, transparent 70%)`
      }} />

      <div className="scan-floating-orb scan-orb-1" style={{
        background: `radial-gradient(circle, ${orbs.primary} 0%, transparent 70%)`
      }} />
      <div className="scan-floating-orb scan-orb-2" style={{
        background: `radial-gradient(circle, ${orbs.secondary} 0%, transparent 70%)`,
        animationDelay: '1s'
      }} />
      {orbs.tertiary && (
        <div className="scan-floating-orb scan-orb-3" style={{
          background: `radial-gradient(circle, ${orbs.tertiary} 0%, transparent 70%)`,
          animationDelay: '2s'
        }} />
      )}

      {grid && <div className="scan-grid-overlay" />}

      <div className="scan-content-center">
        {children}
      </div>
    </div>
  );
}
