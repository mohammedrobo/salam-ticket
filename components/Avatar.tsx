'use client';

import { type DriverVariant } from '@/lib/types';

const variantStyles: Record<DriverVariant, string> = {
  waiting: 'avatar-base avatar-waiting',
  next: 'avatar-base avatar-next',
  done: 'avatar-base avatar-done',
  on_break: 'avatar-base avatar-break',
};

export default function Avatar({
  name,
  variant = 'waiting',
}: {
  name: string;
  variant?: DriverVariant;
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={variantStyles[variant]}>
      <span>{initials}</span>
    </div>
  );
}
