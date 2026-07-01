'use client';

import { useState, useEffect } from 'react';
import { type Driver, type DriverVariant } from '@/lib/types';
import Avatar from './Avatar';
import { StatusBadge } from './Badge';

const BREAK_DURATION_MS = 60 * 60 * 1000;

function BreakCountdown({ breakStartedAt, isArabic }: { breakStartedAt: string; isArabic: boolean }) {
  const [remaining, setRemaining] = useState(() => {
    const start = new Date(breakStartedAt).getTime();
    return Math.max(0, start + BREAK_DURATION_MS - Date.now());
  });

  useEffect(() => {
    const calc = () => {
      const start = new Date(breakStartedAt).getTime();
      return Math.max(0, start + BREAK_DURATION_MS - Date.now());
    };
    const interval = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(interval);
  }, [breakStartedAt]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <span className="break-countdown">
      {isArabic ? 'يعود خلال' : 'Returns in'} {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

function useRelativeTime(dateStr: string) {
  const [timeAgo, setTimeAgo] = useState(() => calcRelative(dateStr));

  useEffect(() => {
    const interval = setInterval(() => setTimeAgo(calcRelative(dateStr)), 30000);
    return () => clearInterval(interval);
  }, [dateStr]);

  return timeAgo;
}

function calcRelative(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr + 'Z').getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function calcRelativeArabic(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr + 'Z').getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins}د`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `منذ ${diffHours}س`;
  return `منذ ${Math.floor(diffHours / 24)}ي`;
}

function useRelativeTimeArabic(dateStr: string) {
  const [timeAgo, setTimeAgo] = useState(() => calcRelativeArabic(dateStr));

  useEffect(() => {
    const interval = setInterval(() => setTimeAgo(calcRelativeArabic(dateStr)), 30000);
    return () => clearInterval(interval);
  }, [dateStr]);

  return timeAgo;
}

export default function DriverCard({
  driver,
  position,
  isArabic,
  variant,
  onDone,
  onBreak,
  isCompleting,
  exiting,
}: {
  driver: Driver;
  position: number;
  isArabic?: boolean;
  variant: DriverVariant;
  onDone?: () => void;
  onBreak?: () => void;
  isCompleting?: boolean;
  exiting?: boolean;
}) {
  const scannedDate = new Date(driver.scanned_at + 'Z');
  const time = scannedDate.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !isArabic,
  });

  const timeAgoHook = useRelativeTime(driver.scanned_at);
  const timeAgoArabic = useRelativeTimeArabic(driver.scanned_at);
  const timeAgo = isArabic ? timeAgoArabic : timeAgoHook;

  const completedTimeAgo = (() => {
    if (!driver.completed_at) return '';
    return isArabic ? calcRelativeArabic(driver.completed_at) : calcRelative(driver.completed_at);
  })();

  const isNext = variant === 'next';
  const isOnBreak = variant === 'on_break';
  const isDone = variant === 'done';

  const cardClass = [
    'driver-card tilt-card',
    isNext && 'driver-card-next',
    isDone && 'driver-card-done',
    isOnBreak && 'driver-card-break',
    exiting && 'card-exit',
  ].filter(Boolean).join(' ');

  const positionClass = [
    'driver-position',
    isNext && 'driver-position-next',
    isDone && 'driver-position-done',
    isOnBreak && 'driver-position-break',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      <div className={positionClass}>
        {isDone ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : isOnBreak ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ) : (
          <span>{position}</span>
        )}
      </div>

      <Avatar name={driver.name} variant={variant} />

      <div className="info flex justify-between items-center w-full gap-4">
        <div className="flex-1 min-w-0">
          <h3 className={`truncate mb-1 ${isDone ? 'text-[var(--text-muted)]' : ''} ${isOnBreak ? 'text-[var(--text-secondary)]' : ''}`}>
            {driver.name}
          </h3>
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

        <div className="shrink-0 flex items-center gap-2">
          {isOnBreak ? (
            <>
              <StatusBadge variant="on_break" isArabic={!!isArabic} />
              {driver.break_started_at && (
                <BreakCountdown breakStartedAt={driver.break_started_at} isArabic={!!isArabic} />
              )}
            </>
          ) : isDone ? (
            <StatusBadge variant="done" isArabic={!!isArabic} timeAgo={completedTimeAgo} />
          ) : (
            <>
              {isNext && (
                <StatusBadge variant="next" isArabic={!!isArabic} shimmer />
              )}
              <button
                onClick={onDone}
                disabled={isCompleting}
                className="driver-done-btn ripple-container"
                title={isArabic ? 'تم' : 'Done'}
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
              {isNext && onBreak && (
                <button
                  onClick={onBreak}
                  className="driver-break-btn ripple-container"
                  title={isArabic ? 'استراحة' : 'Break'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{isArabic ? 'استراحة' : 'Break'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
