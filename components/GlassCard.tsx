'use client';

import { type ReactNode } from 'react';

export default function GlassCard({
  children,
  className = '',
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`glass-luxury ${hover ? 'glass-hover' : ''} ${className}`}>
      {children}
    </div>
  );
}
