'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [office, setOffice] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setTimeout(() => inputRef.current?.focus(), 600);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedOffice = office.trim().toUpperCase();
    const trimmedPassword = password.trim();

    if (!trimmedOffice || !trimmedPassword) {
      setError('Please enter office and password');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ office: trimmedOffice, password: trimmedPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error — check your connection');
    } finally {
      setIsSubmitting(false);
    }
  }, [office, password, router]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Deep dark background */}
      <div className="absolute inset-0 bg-[#06060a]" />

      {/* Atmospheric gradient orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] rounded-full animate-float" style={{
        background: 'radial-gradient(circle, rgba(77, 141, 255, 0.025) 0%, transparent 70%)',
        filter: 'blur(100px)'
      }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full animate-float" style={{
        background: 'radial-gradient(circle, rgba(52, 211, 153, 0.02) 0%, transparent 70%)',
        filter: 'blur(80px)',
        animationDelay: '2s'
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
      <div className="relative z-10 w-full max-w-[420px] px-8">
        {/* Logo / Brand mark */}
        <div className={`text-center mb-12 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="mx-auto mb-6 brand-mark">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center relative" style={{
              background: 'linear-gradient(135deg, rgba(77, 141, 255, 0.12) 0%, rgba(77, 141, 255, 0.04) 100%)',
              border: '1px solid rgba(77, 141, 255, 0.12)'
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <div className="absolute inset-0 rounded-2xl" style={{
                background: 'radial-gradient(circle at center, rgba(77, 141, 255, 0.06) 0%, transparent 70%)'
              }} />
            </div>
          </div>

          <h1 className="font-display text-[34px] font-bold tracking-[-0.04em] mb-3" style={{ color: 'var(--text-primary)' }}>
            Fleet Manager
          </h1>
          <p className="text-[15px] tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Sign in to your office
          </p>
        </div>

        {/* Form card */}
        <div className={`transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="relative">
            <div className="absolute -inset-px rounded-3xl opacity-50 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(77, 141, 255, 0.04) 0%, transparent 60%)'
            }} />

            <div className="glass-luxury rounded-3xl px-10 py-10 relative">
              <div className="absolute top-0 left-10 right-10 h-px" style={{
                background: 'linear-gradient(90deg, transparent, rgba(77, 141, 255, 0.12), transparent)'
              }} />

              <form onSubmit={handleSubmit}>
                {/* Office field */}
                <div className="mb-6">
                  <label className="block text-[11px] font-semibold mb-3 tracking-[0.15em] uppercase" style={{ color: 'var(--text-ghost)' }}>
                    Office
                  </label>
                  <div className="relative group">
                    <input
                      ref={inputRef}
                      type="text"
                      value={office}
                      onChange={(e) => { setOffice(e.target.value); setError(''); }}
                      placeholder="QCA2"
                      className="premium-input w-full"
                      autoComplete="organization"
                    />
                    <div className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-500 opacity-0 group-focus-within:opacity-100" style={{
                      background: 'radial-gradient(ellipse at center, rgba(77, 141, 255, 0.04) 0%, transparent 70%)',
                      transform: 'scale(1.5)'
                    }} />
                  </div>
                </div>

                {/* Password field */}
                <div className="mb-8">
                  <label className="block text-[11px] font-semibold mb-3 tracking-[0.15em] uppercase" style={{ color: 'var(--text-ghost)' }}>
                    Password
                  </label>
                  <div className="relative group">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="Enter password"
                      className="premium-input w-full"
                      autoComplete="current-password"
                    />
                    <div className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-500 opacity-0 group-focus-within:opacity-100" style={{
                      background: 'radial-gradient(ellipse at center, rgba(77, 141, 255, 0.04) 0%, transparent 70%)',
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
                  disabled={isSubmitting || !office.trim() || !password.trim()}
                  className="w-full py-4 rounded-xl font-display font-bold text-[15px] tracking-[-0.01em] text-white transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-dim) 100%)',
                    boxShadow: '0 2px 8px rgba(77, 141, 255, 0.2)'
                  }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
