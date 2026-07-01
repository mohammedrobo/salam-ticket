'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [office, setOffice] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const officeRef = useRef<HTMLInputElement>(null);
  const formSideRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => officeRef.current?.focus(), 800);
  }, []);

  useEffect(() => {
    const formSide = formSideRef.current;
    if (!formSide) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = formSide.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      if (orb1Ref.current) {
        orb1Ref.current.style.transform = `translate(${x * -15}px, ${y * -15}px)`;
      }
      if (orb2Ref.current) {
        orb2Ref.current.style.transform = `translate(${x * -8}px, ${y * -8}px)`;
      }
    };

    formSide.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => formSide.removeEventListener('mousemove', handleMouseMove);
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
    <div className="login-split">
      {/* ─── LEFT: Hero Panel ─── */}
      <div className="login-hero">
        {/* Atmospheric orbs */}
        <div className="login-hero-orb-1" />
        <div className="login-hero-orb-2" />

        {/* Ghosted background text */}
        <div className="login-hero-bg-text">Fleet</div>

        {/* Bottom accent line */}
        <div className="login-hero-accent-line" />

        {/* Content */}
        <div
          className="relative z-10"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translateY(32px)',
            transition: 'all 1s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* Brand icon */}
          <div className="login-brand-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--warm-500)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-70"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="login-hero-title">
            Fleet
            <span>Manager</span>
          </h1>

          {/* Divider */}
          <div className="login-hero-divider" />

          {/* Subtitle */}
          <p className="login-hero-subtitle">
            Real-time driver management and check-in system for your office
            operations.
          </p>
        </div>
      </div>

      {/* ─── RIGHT: Login Form ─── */}
      <div className="login-form-side" ref={formSideRef}>
        {/* Ambient orb (parallax) */}
        <div className="login-ambient-orb" ref={orb1Ref} />
        <div
          className="login-ambient-orb"
          ref={orb2Ref}
          style={{
            top: 'auto',
            bottom: '10%',
            right: 'auto',
            left: '-5%',
            width: '350px',
            height: '350px',
          }}
        />

        {/* Panel divider */}
        <div className="login-panel-divider" />

        <div className="relative z-10 w-full" style={{ maxWidth: '420px' }}>
          {/* Mobile-only brand */}
          <div
            className="login-mobile-brand lg:hidden"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'none' : 'translateY(20px)',
              transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s',
            }}
          >
            <div className="login-brand-icon">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--warm-500)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-70"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <h1>Fleet</h1>
            <p>Sign in to your office</p>
          </div>

          {/* Form card */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'none' : 'translateY(24px)',
              transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.25s',
            }}
          >
            <div className="login-form-card">
              {/* Glow behind card */}
              <div className="login-form-card-glow" />

              <div className="login-form-card-inner">
                {/* Top accent line */}
                <div className="login-form-card-topline" />

                {/* Header */}
                <div className="login-form-header">
                  <p>Welcome back</p>
                  <h2>Sign in to continue</h2>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Office field */}
                  <div className="login-field">
                    <label>Office</label>
                    <div className="login-field-wrapper">
                      <input
                        ref={officeRef}
                        type="text"
                        value={office}
                        onChange={(e) => {
                          setOffice(e.target.value);
                          setError('');
                        }}
                        placeholder="QCA2"
                        className="login-input"
                        autoComplete="organization"
                      />
                      <div className="login-input-line" />
                      <div className="login-input-glow" />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="login-field">
                    <label>Password</label>
                    <div className="login-field-wrapper">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        placeholder="Enter password"
                        className="login-input"
                        autoComplete="current-password"
                      />
                      <div className="login-input-line" />
                      <div className="login-input-glow" />
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="login-error">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--accent-red)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || !office.trim() || !password.trim()
                    }
                    className="login-submit"
                  >
                    {isSubmitting ? (
                      <span className="login-submit-loading">
                        <svg
                          className="animate-spin"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>

                {/* Footer */}
                <div className="login-form-footer">
                  <p>Contact your administrator for credentials</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
