'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function ScanPage() {
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedNameRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
    savedNameRef.current = localStorage.getItem('driverName');
    if (savedNameRef.current) {
      setName(savedNameRef.current);
    }
    setTimeout(() => inputRef.current?.focus(), 600);
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

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('driverName', trimmed);
        setSubmitted(true);
      } else {
        setError(data.error || `Server error (${res.status})`);
      }
    } catch (err) {
      console.error('Check-in error:', err);
      setError('Network error — check your connection');
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
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Premium background */}
        <div className="absolute inset-0 bg-[#06060a]" />
        <div className="absolute inset-0 opacity-40" style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(232, 175, 74, 0.06) 0%, transparent 70%)'
        }} />

        {/* Floating ambient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.03] animate-float" style={{
          background: 'radial-gradient(circle, rgba(232, 175, 74, 0.4) 0%, transparent 70%)',
          filter: 'blur(80px)'
        }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.02] animate-float" style={{
          background: 'radial-gradient(circle, rgba(180, 140, 60, 0.4) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animationDelay: '1s'
        }} />

        <div className="relative z-10 w-full max-w-[480px] px-8">
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {/* Success card */}
            <div className="relative">
              {/* Glow behind card */}
              <div className="absolute -inset-2 rounded-3xl opacity-60" style={{
                background: 'radial-gradient(ellipse at center, rgba(232, 175, 74, 0.08) 0%, transparent 70%)',
                filter: 'blur(24px)'
              }} />

              <div className="relative glass-luxury rounded-3xl px-12 py-14 text-center">
                {/* Radial gradient overlay */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(232, 175, 74, 0.04) 0%, transparent 60%)'
                  }} />
                </div>

                <div className="relative">
                  {/* Animated check */}
                  <div className="mb-10">
                    <div className="mx-auto success-ring animate-success-ring">
                      <div className="success-check animate-success-check">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Success text */}
                  <h1 className="font-display text-[30px] font-bold tracking-[-0.03em] mb-3" style={{ color: 'var(--text-primary)' }}>
                    Welcome aboard
                  </h1>
                  <p className="text-[15px] font-light tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {name.trim()}, you&apos;re checked in
                  </p>

                  {/* Subtle divider */}
                  <div className="mt-10 mb-8 mx-auto w-12 h-px" style={{
                    background: 'linear-gradient(90deg, transparent, rgba(232, 175, 74, 0.2), transparent)'
                  }} />

                  {/* Status badge */}
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full" style={{
                    background: 'rgba(232, 175, 74, 0.06)',
                    border: '1px solid rgba(232, 175, 74, 0.1)'
                  }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-gold)' }} />
                    <span className="text-[12px] font-medium tracking-wide uppercase" style={{ color: 'var(--accent-gold)' }}>
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Deep dark background */}
      <div className="absolute inset-0 bg-[#06060a]" />

      {/* Atmospheric gradient orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] rounded-full animate-float" style={{
        background: 'radial-gradient(circle, rgba(232, 175, 74, 0.025) 0%, transparent 70%)',
        filter: 'blur(100px)'
      }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full animate-float" style={{
        background: 'radial-gradient(circle, rgba(180, 140, 60, 0.02) 0%, transparent 70%)',
        filter: 'blur(80px)',
        animationDelay: '2s'
      }} />
      <div className="absolute top-[40%] right-[10%] w-[300px] h-[300px] rounded-full animate-float" style={{
        background: 'radial-gradient(circle, rgba(232, 175, 74, 0.015) 0%, transparent 70%)',
        filter: 'blur(60px)',
        animationDelay: '4s'
      }} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px'
      }} />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-[480px] px-8">
        {/* Logo / Brand mark */}
        <div className={`text-center mb-12 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="mx-auto mb-6 brand-mark">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center relative" style={{
              background: 'linear-gradient(135deg, rgba(232, 175, 74, 0.12) 0%, rgba(232, 175, 74, 0.04) 100%)',
              border: '1px solid rgba(232, 175, 74, 0.12)'
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
              {/* Subtle glow */}
              <div className="absolute inset-0 rounded-2xl" style={{
                background: 'radial-gradient(circle at center, rgba(232, 175, 74, 0.06) 0%, transparent 70%)'
              }} />
            </div>
          </div>

          <h1 className="font-display text-[34px] font-bold tracking-[-0.04em] mb-3" style={{ color: 'var(--text-primary)' }}>
            Driver Check-In
          </h1>
          <p className="text-[15px] tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Enter your name to join the queue
          </p>
        </div>

        {/* Form card */}
        <div className={`transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="relative">
            {/* Card glow */}
            <div className="absolute -inset-px rounded-3xl opacity-50 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(232, 175, 74, 0.04) 0%, transparent 60%)'
            }} />

            <div className="glass-luxury rounded-3xl px-10 py-10 relative">
              {/* Top edge highlight */}
              <div className="absolute top-0 left-10 right-10 h-px" style={{
                background: 'linear-gradient(90deg, transparent, rgba(232, 175, 74, 0.12), transparent)'
              }} />

              <form onSubmit={handleSubmit}>
                {/* Input group */}
                <div className="mb-8">
                  <label className="block text-[11px] font-semibold mb-3 tracking-[0.15em] uppercase" style={{ color: 'var(--text-ghost)' }}>
                    Full Name
                  </label>
                  <div className="relative group">
                    <input
                      ref={inputRef}
                      type="text"
                      value={name}
                      onChange={handleNameChange}
                      placeholder="Ahmed Mohammed"
                      className="premium-input w-full"
                      autoComplete="name"
                    />
                    {/* Focus glow */}
                    <div className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-500 opacity-0 group-focus-within:opacity-100" style={{
                      background: 'radial-gradient(ellipse at center, rgba(232, 175, 74, 0.04) 0%, transparent 70%)',
                      transform: 'scale(1.5)'
                    }} />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-xl animate-fade-in" style={{
                    background: 'rgba(255, 107, 107, 0.06)',
                    border: '1px solid rgba(255, 107, 107, 0.1)'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span className="text-[13px]" style={{ color: 'var(--accent-red)' }}>{error}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="premium-button w-full"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Checking in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Check In
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-0.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </span>
                  )}
                </button>
              </form>

              {/* Footer note */}
              <div className="mt-7 pt-6 text-center" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}>
                <p className="text-[11px] tracking-wide" style={{ color: 'var(--text-ghost)' }}>
                  Name saved for future check-ins
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
