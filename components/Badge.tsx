'use client';

import { type DriverVariant } from '@/lib/types';

const statusClasses: Record<DriverVariant, string> = {
  waiting: 'driver-badge driver-badge-waiting',
  next: 'driver-badge driver-badge-next',
  done: 'driver-badge-done',
  on_break: 'driver-badge driver-badge-break',
};

const statusDotClasses: Record<DriverVariant, string> = {
  waiting: 'driver-badge-dot',
  next: 'driver-badge-dot driver-badge-dot-pulse',
  done: '',
  on_break: 'driver-badge-dot-break',
};

const statusLabels: Record<DriverVariant, { en: string; ar: string }> = {
  waiting: { en: 'Waiting', ar: 'في الانتظار' },
  next: { en: 'Next Up', ar: 'التالي' },
  done: { en: 'Done', ar: 'تم' },
  on_break: { en: 'On Break', ar: 'استراحة' },
};

export function StatusBadge({
  variant,
  isArabic,
  shimmer = false,
  timeAgo,
}: {
  variant: DriverVariant;
  isArabic: boolean;
  shimmer?: boolean;
  timeAgo?: string;
}) {
  const label = isArabic ? statusLabels[variant].ar : statusLabels[variant].en;
  const dotClass = statusDotClasses[variant];

  if (variant === 'done') {
    return (
      <div className={statusClasses[variant]}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{label}</span>
        {timeAgo && <span className="driver-badge-time">{timeAgo}</span>}
      </div>
    );
  }

  return (
    <div className={statusClasses[variant]}>
      {shimmer && <div className="driver-badge-shimmer" />}
      {dotClass && <div className={dotClass} />}
      <span>{label}</span>
    </div>
  );
}

export function CountBadge({
  count,
  type,
  isArabic,
}: {
  count: number;
  type: 'waiting' | 'done' | 'break';
  isArabic: boolean;
}) {
  const labels = {
    waiting: isArabic ? 'في الانتظار' : 'waiting',
    done: isArabic ? 'تم' : 'done',
    break: isArabic ? 'استراحة' : 'break',
  };

  const classMap = {
    waiting: 'driver-count-badge driver-count-waiting',
    done: 'driver-count-badge driver-count-done',
    break: 'driver-count-badge driver-count-break',
  };

  return (
    <span className={classMap[type]}>
      {count} {labels[type]}
    </span>
  );
}
