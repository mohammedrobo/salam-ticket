'use client';

export default function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="shimmer skeleton-card"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}
