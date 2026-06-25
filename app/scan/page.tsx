'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Driver {
  id: number;
  name: string;
  scanned_at: string;
  status: string;
  office_id: string;
}

function ScanContent() {
  const searchParams = useSearchParams();
  const office = searchParams.get('office') || 'QCA2';

  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [aheadCount, setAheadCount] = useState<number>(0);
  const [checkedOut, setCheckedOut] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedNameRef = useRef<string | null>(null);
  const driverNameRef = useRef<string>('');

  useEffect(() => {
    setMounted(true);
    savedNameRef.current = localStorage.getItem(`driverName_${office}`);
    if (savedNameRef.current) {
      setName(savedNameRef.current);
    }
    setTimeout(() => inputRef.current?.focus(), 600);
  }, [office]);

  // Poll queue position after check-in
  useEffect(() => {
    if (!submitted || checkedOut) return;

    const checkPosition = async () => {
      try {
        const res = await fetch('/api/drivers');
        const drivers: Driver[] = await res.json();

        const myIndex = drivers.findIndex(
          (d) => d.name.toLowerCase() === driverNameRef.current.toLowerCase()
        );

        if (myIndex === -1) {
          setCheckedOut(true);
          return;
        }

        setPosition(myIndex + 1);
        setAheadCount(myIndex);
      } catch {
        // retry next interval
      }
    };

    checkPosition();
    const interval = setInterval(checkPosition, 3000);
    return () => clearInterval(interval);
  }, [submitted, checkedOut]);

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
        body: JSON.stringify({ name: trimmed, office_id: office }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem(`driverName_${office}`, trimmed);
        driverNameRef.current = trimmed;
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
  }, [name, office]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError('');
  }, []);

  // Checked out screen
  if (submitted && checkedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[#06060a]" />
        <div className="absolute inset-0 opacity-40" style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(52, 211, 153, 0.06) 0%, transparent 70%)'
        }} />

        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.03] animate-float" style={{
          background: 'radial-gradient(circle, rgba(52, 211, 153, 0.4) 0%, transparent 70%)',
          filter: 'blur(80px)'
        }} />

        <div className="relative z-10 w-full max-w-[480px] px-8">
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="relative">
              <div className="absolute -inset-2 rounded-3xl opacity-60" style={{
                background: 'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.08) 0%, transparent 70%)',
                filter: 'blur(24px)'
              }} />

              <div className="relative glass-luxury rounded-3xl px-10 py-10 text-center">
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(52, 211, 153, 0.04) 0%, transparent 60%)'
                  }} />
                </div>

                <div className="relative">
                  <div className="mb-6">
                    <div className="mx-auto success-ring animate-success-ring" style={{
                      background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(52, 211, 153, 0.03) 100%)',
                      borderColor: 'rgba(52, 211, 153, 0.12)'
                    }}>
                      <div className="success-check animate-success-check" style={{
                        background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
                        boxShadow: '0 0 40px rgba(52, 211, 153, 0.15), 0 8px 24px -4px rgba(52, 211, 153, 0.2)'
                      }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <h1 className="font-display text-[30px] font-bold tracking-[-0.03em] mb-3" style={{ color: 'var(--text-primary)' }}>
                    You&apos;re up!
                  </h1>
                  <p className="text-[15px] font-light tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {driverNameRef.current}, the manager is ready for you
                  </p>

                  <div className="my-8 mx-auto w-12 h-px" style={{
                    background: 'linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.2), transparent)'
                  }} />

                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full" style={{
                    background: 'rgba(52, 211, 153, 0.06)',
                    border: '1px solid rgba(52, 211, 153, 0.1)'
                  }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} />
                    <span className="text-[12px] font-medium tracking-wide uppercase" style={{ color: '#34d399' }}>
                      Go to dock
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

  // Checked in — show queue position
  if (submitted) {
    const isNext = position === 1;
    const accentColor = isNext ? '#34d399' : 'var(--accent-gold)';
    const accentGlow = isNext ? 'rgba(52, 211, 153,' : 'rgba(232, 175, 74,';

    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[#06060a]" />
        <div className="absolute inset-0 opacity-40" style={{
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${accentGlow} 0.06) 0%, transparent 70%)`
        }} />

        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.03] animate-float" style={{
          background: `radial-gradient(circle, ${accentGlow} 0.4) 0%, transparent 70%)`,
          filter: 'blur(80px)'
        }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.02] animate-float" style={{
          background: `radial-gradient(circle, ${accentGlow} 0.3) 0%, transparent 70%)`,
          filter: 'blur(60px)',
          animationDelay: '1s'
        }} />

        <div className="relative z-10 w-full max-w-[480px] px-8">
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="relative">
              <div className="absolute -inset-2 rounded-3xl opacity-60" style={{
                background: `radial-gradient(ellipse at center, ${accentGlow} 0.08) 0%, transparent 70%)`,
                filter: 'blur(24px)'
              }} />

              <div className="relative glass-luxury rounded-3xl px-10 py-10 text-center">
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0" style={{
                    background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accentGlow} 0.04) 0%, transparent 60%)`
                  }} />
                </div>

                <div className="relative">
                  <div className="mb-6">
                    {position !== null ? (
                      <div className={`transition-all duration-500 ${isNext ? 'animate-scale-in' : ''}`}>
                        <span className="font-display text-[80px] font-800 leading-none tracking-tighter" style={{
                          color: accentColor,
                          textShadow: `0 0 60px ${accentGlow} 0.3)`
                        }}>
                          {position}
                        </span>
                      </div>
                    ) : (
                      <div className="w-16 h-16 mx-auto rounded-full shimmer" />
                    )}
                  </div>

                  <h1 className="font-display text-[28px] font-bold tracking-[-0.03em] mb-3" style={{ color: 'var(--text-primary)' }}>
                    {isNext ? "You're next!" : 'In the queue'}
                  </h1>
                  <p className="text-[15px] font-light tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {driverNameRef.current}, {isNext
                      ? 'get ready — you\'ll be called shortly'
                      : aheadCount === 1
                        ? '1 driver ahead of you'
                        : `${aheadCount} drivers ahead of you`
                    }
                  </p>

                  <div className="my-8 mx-auto w-12 h-px" style={{
                    background: `linear-gradient(90deg, transparent, ${accentColor}33, transparent)`
                  }} />

                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full" style={{
                    background: `${accentColor}0a`,
                    border: `1px solid ${accentColor}1a`
                  }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />
                    <span className="text-[12px] font-medium tracking-wide uppercase" style={{ color: accentColor }}>
                      {isNext ? 'Next up' : 'Waiting'}
                    </span>
                  </div>

                  {position !== null && position > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-1.5">
                      {Array.from({ length: Math.min(position, 8) }, (_, i) => (
                        <div
                          key={i}
                          className="rounded-full transition-all duration-300"
                          style={{
                            width: i === 0 ? '20px' : '6px',
                            height: '6px',
                            background: i === 0 ? accentColor : `${accentColor}30`,
                            borderRadius: i === 0 ? '3px' : '50%',
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Office badge */}
                  <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{
                    background: 'rgba(77, 141, 255, 0.06)',
                    border: '1px solid rgba(77, 141, 255, 0.1)'
                  }}>
                    <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: 'var(--accent-blue)' }}>
                      {office}
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
      <div className="absolute inset-0 bg-[#06060a]" />

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

      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px'
      }} />

      <div className="relative z-10 w-full max-w-[480px] px-8">
        <div className={`text-center mb-10 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
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
              <div className="absolute inset-0 rounded-2xl" style={{
                background: 'radial-gradient(circle at center, rgba(232, 175, 74, 0.06) 0%, transparent 70%)'
              }} />
            </div>
          </div>

          <h1 className="font-display text-[34px] font-bold tracking-[-0.04em] mb-3" style={{ color: 'var(--text-primary)' }}>
            Driver Check-In
          </h1>
          <p className="text-[15px] tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Enter your name to join the queue
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{
            background: 'rgba(77, 141, 255, 0.06)',
            border: '1px solid rgba(77, 141, 255, 0.1)'
          }}>
            <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: 'var(--accent-blue)' }}>
              {office}
            </span>
          </div>
        </div>

        <div className={`transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="relative">
            <div className="absolute -inset-px rounded-3xl opacity-50 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(232, 175, 74, 0.04) 0%, transparent 60%)'
            }} />

            <div className="glass-luxury rounded-3xl px-10 py-10 relative">
              <div className="absolute top-0 left-10 right-10 h-px" style={{
                background: 'linear-gradient(90deg, transparent, rgba(232, 175, 74, 0.12), transparent)'
              }} />

              <form onSubmit={handleSubmit}>
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
                    <div className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-500 opacity-0 group-focus-within:opacity-100" style={{
                      background: 'radial-gradient(ellipse at center, rgba(232, 175, 74, 0.04) 0%, transparent 70%)',
                      transform: 'scale(1.5)'
                    }} />
                  </div>
                </div>

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

              <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}>
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

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#06060a]">
        <div className="shimmer w-48 h-8 rounded-lg" />
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}
