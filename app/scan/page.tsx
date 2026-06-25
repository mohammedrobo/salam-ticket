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
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(74, 222, 128, 0.04) 0%, var(--bg-primary) 70%)'
      }}>
        <div className="w-full max-w-[320px] animate-scale-in">
          <div className="glass rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-emerald)]/[0.02] to-transparent pointer-events-none"></div>
            
            <div className="relative mb-5">
              <div className="w-18 h-18 mx-auto rounded-full bg-gradient-to-br from-[var(--accent-emerald)] to-[#22c55e] flex items-center justify-center animate-check-bounce" style={{
                width: '72px',
                height: '72px',
                boxShadow: '0 0 40px var(--accent-emerald-glow), 0 12px 24px -6px rgba(74, 222, 128, 0.2)'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <h1 className="font-display text-xl font-semibold tracking-tight mb-1.5">
              Done!
            </h1>
            <p className="text-[var(--text-secondary)] text-[13px]">
              Your name has been submitted
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{
      background: 'radial-gradient(ellipse 50% 40% at 30% 20%, rgba(91, 154, 255, 0.03) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 70% 80%, rgba(255, 192, 98, 0.02) 0%, transparent 60%)'
    }}>
      <div className="w-full max-w-[320px]">
        {/* Header */}
        <div className="text-center mb-7 animate-fade-in-up">
          <div className="w-12 h-12 mx-auto mb-3.5 rounded-xl bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-blue-dim)] flex items-center justify-center shadow-lg" style={{
            boxShadow: '0 0 24px var(--accent-blue-glow), 0 4px 12px rgba(0, 0, 0, 0.2)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-semibold tracking-tight mb-0.5">
            Driver Check-In
          </h1>
          <p className="text-[var(--text-ghost)] text-[13px]">
            Enter your name to join the queue
          </p>
        </div>

        {/* Form */}
        <div className="glass rounded-xl p-5 animate-fade-in-up delay-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[var(--text-ghost)] text-[11px] font-medium mb-1.5 uppercase tracking-widest">
                Full Name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Ahmed Mohammed"
                className="input-field w-full px-3.5 py-3 rounded-lg"
                autoComplete="name"
              />
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-[var(--accent-red)] text-[13px] animate-fade-in">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className="btn-primary w-full py-3 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Checking in...
                </span>
              ) : (
                'Check In'
              )}
            </button>
          </form>

          <div className="mt-4 pt-3.5 border-t border-white/[0.03] text-center">
            <p className="text-[var(--text-ghost)] text-[11px]">
              Name saved for future check-ins
            </p>
          </div>
        </div>

        {/* Back */}
        <div className="text-center mt-4 animate-fade-in-up delay-3">
          <a href="/" className="text-[var(--text-ghost)] text-[11px] hover:text-[var(--text-secondary)] transition-colors inline-flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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