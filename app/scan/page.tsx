'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function ScanPage() {
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedNameRef = useRef<string | null>(null);

  useEffect(() => {
    savedNameRef.current = localStorage.getItem('driverName');
    if (savedNameRef.current) {
      setName(savedNameRef.current);
    }
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      if (res.ok) {
        localStorage.setItem('driverName', trimmed);
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Network error — try again');
    } finally {
      setIsSubmitting(false);
    }
  }, [name]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError('');
  }, []);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5" style={{
        background: 'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.06) 0%, var(--bg-primary) 70%)'
      }}>
        <div className="w-full max-w-sm animate-scale-in">
          <div className="glass rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-emerald)]/[0.03] to-transparent pointer-events-none"></div>
            
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[var(--accent-emerald)] to-[#2ac77a] flex items-center justify-center animate-check-bounce" style={{
                boxShadow: '0 0 48px var(--accent-emerald-glow), 0 16px 32px -8px rgba(52, 211, 153, 0.25)'
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <h1 className="font-display text-2xl font-semibold mb-2">
              Done!
            </h1>
            <p className="text-[var(--text-secondary)] text-base">
              Your name has been submitted
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{
      background: 'radial-gradient(ellipse at 30% 20%, rgba(79, 143, 255, 0.04) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255, 179, 71, 0.03) 0%, transparent 50%)'
    }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[var(--accent-blue)] to-[#3d7ae6] flex items-center justify-center" style={{
            boxShadow: '0 0 32px var(--accent-blue-glow)'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight mb-1">
            Driver Check-In
          </h1>
          <p className="text-[var(--text-muted)] text-sm">
            Enter your name to join the queue
          </p>
        </div>

        {/* Form Card */}
        <div className="glass rounded-2xl p-6 animate-fade-in-up delay-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-2 uppercase tracking-widest">
                Full Name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Ahmed Mohammed"
                className="input-field w-full px-4 py-3.5 rounded-xl"
                autoComplete="name"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[var(--accent-red)] text-sm animate-fade-in">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="btn-primary w-full py-3.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Checking in...
                </span>
              ) : (
                'Check In'
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/[0.04] text-center">
            <p className="text-[var(--text-muted)] text-xs">
              Name saved for future check-ins
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-5 animate-fade-in-up delay-3">
          <a href="/" className="text-[var(--text-muted)] text-xs hover:text-[var(--text-secondary)] transition-colors inline-flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}