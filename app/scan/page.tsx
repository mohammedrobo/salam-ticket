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

function generateDeviceId(): string {
  return crypto.randomUUID();
}

function getDeviceTokenKey(office: string): string {
  return `device_token_${office}`;
}

function getSavedNameKey(office: string): string {
  return `driverName_${office}`;
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
  const [deviceLoading, setDeviceLoading] = useState(true);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [driverId, setDriverId] = useState<number | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const driverNameRef = useRef<string>('');
  const deviceIdRef = useRef<string>('');

  // Initialize device token on mount
  useEffect(() => {
    setMounted(true);

    const storedToken = localStorage.getItem(getDeviceTokenKey(office));
    if (storedToken) {
      deviceIdRef.current = storedToken;
    } else {
      const newToken = generateDeviceId();
      deviceIdRef.current = newToken;
      localStorage.setItem(getDeviceTokenKey(office), newToken);
    }

    // Also load saved name for fallback
    const savedName = localStorage.getItem(getSavedNameKey(office));
    if (savedName) {
      setName(savedName);
    }

    setTimeout(() => inputRef.current?.focus(), 600);
  }, [office]);

  // Check device registration on mount
  useEffect(() => {
    if (!deviceIdRef.current) return;

    const checkDevice = async () => {
      try {
        const res = await fetch(
          `/api/drivers/check-device?device_id=${deviceIdRef.current}&office=${office}`
        );
        const data = await res.json();

        if (data.registered) {
          if (data.status === 'waiting') {
            // Device is in queue — show position directly
            driverNameRef.current = data.driver.name;
            setSubmitted(true);
          } else if (data.status === 'checked_out') {
            // Device was checked out — show welcome back
            setRegisteredName(data.driver.name);
            setWelcomeBack(true);
            driverNameRef.current = data.driver.name;
          }
        }
      } catch {
        // Network error — show form as fallback
      } finally {
        setDeviceLoading(false);
      }
    };

    checkDevice();
  }, [office, mounted]);

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
        setDriverId(drivers[myIndex].id);
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
        body: JSON.stringify({
          name: trimmed,
          office_id: office,
          device_id: deviceIdRef.current,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem(getSavedNameKey(office), trimmed);
        driverNameRef.current = trimmed;
        setSubmitted(true);
      } else if (data.error === 'device_mismatch') {
        setError(`This device is already registered to ${data.registered_name}`);
      } else if (data.error === 'already_in_queue') {
        // Device is already in queue — show position
        driverNameRef.current = data.driver.name;
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

  const handleReJoin = useCallback(async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registeredName,
          office_id: office,
          device_id: deviceIdRef.current,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        driverNameRef.current = registeredName;
        setWelcomeBack(false);
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to re-join');
      }
    } catch (err) {
      console.error('Re-join error:', err);
      setError('Network error — check your connection');
    } finally {
      setIsSubmitting(false);
    }
  }, [registeredName, office]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError('');
  }, []);

  const handleFinish = useCallback(async () => {
    if (!driverId) return;
    setIsFinishing(true);
    try {
      const res = await fetch(`/api/drivers?id=${driverId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSubmitted(false);
        setCheckedOut(false);
        setPosition(null);
        setRegisteredName(driverNameRef.current);
        setWelcomeBack(true);
      }
    } catch {
      // keep user on position screen
    } finally {
      setIsFinishing(false);
    }
  }, [driverId]);

  const handleDismiss = useCallback(() => {
    setSubmitted(false);
    setCheckedOut(false);
    setPosition(null);
    setRegisteredName(driverNameRef.current);
    setWelcomeBack(true);
  }, []);

  // Loading state while checking device
  if (deviceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06060a]">
        <div className="shimmer w-48 h-8 rounded-lg" />
      </div>
    );
  }

  // Checked out screen (polling detected removal)
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

              <div className="relative glass-luxury rounded-3xl px-6 py-12 md:px-12 md:py-16 text-center shadow-2xl border border-[var(--border-subtle)] backdrop-blur-2xl">
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

                  <h1 className="font-display text-[var(--text-5xl)] font-900 tracking-[-0.05em] uppercase mb-4" style={{ color: 'var(--text-primary)' }}>
                    You&apos;re up!
                  </h1>
                  <p className="text-[var(--text-xl)] font-light tracking-wide opacity-80" style={{ color: 'var(--text-muted)' }}>
                    {driverNameRef.current}, the manager is ready for you
                  </p>

                  <div className="my-8 mx-auto w-12 h-px" style={{
                    background: 'linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.2), transparent)'
                  }} />

                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8" style={{
                    background: 'rgba(52, 211, 153, 0.06)',
                    border: '1px solid rgba(52, 211, 153, 0.1)'
                  }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} />
                    <span className="text-[12px] font-medium tracking-wide uppercase" style={{ color: '#34d399' }}>
                      Go to dock
                    </span>
                  </div>

                  <button
                    onClick={handleDismiss}
                    className="w-full relative group overflow-hidden rounded-2xl p-[2px] transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.5) 0%, rgba(16, 185, 129, 0.8) 100%)',
                      boxShadow: '0 8px 32px rgba(52, 211, 153, 0.3)'
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20 blur-md group-hover:bg-white/30 transition-all duration-300" />
                    <div className="relative bg-[#06060a]/90 backdrop-blur-xl rounded-xl px-8 py-5 flex items-center justify-center gap-3 transition-all duration-300 group-hover:bg-transparent">
                      <span className="flex items-center justify-center gap-3 text-white font-display text-[var(--text-xl)] font-900 tracking-wide uppercase">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Complete Order
                      </span>
                    </div>
                  </button>
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

              <div className="relative glass-luxury rounded-3xl px-6 py-12 md:px-12 md:py-16 text-center shadow-2xl border border-[var(--border-subtle)] backdrop-blur-2xl">
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0" style={{
                    background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accentGlow} 0.04) 0%, transparent 60%)`
                  }} />
                </div>

                <div className="relative">
                  <div className="mb-6">
                    {position !== null ? (
                      <div className={`transition-all duration-500 ${isNext ? 'animate-scale-in' : ''}`}>
                        <span className="font-display text-[100px] md:text-[140px] font-900 leading-none tracking-tighter block mb-6 md:mb-8" style={{
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

                  <h1 className="font-display text-[var(--text-4xl)] font-900 tracking-[-0.04em] uppercase mb-4" style={{ color: 'var(--text-primary)' }}>
                    {isNext ? "You're next!" : 'In the queue'}
                  </h1>
                  <p className="text-[var(--text-lg)] font-light tracking-wide opacity-80" style={{ color: 'var(--text-muted)' }}>
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

                  {isNext && (
                    <div className="mt-8">
                      <button
                        onClick={handleFinish}
                        disabled={isFinishing}
                        className="w-full relative group overflow-hidden rounded-2xl p-[2px] transition-all duration-300"
                        style={{
                          background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.5) 0%, rgba(16, 185, 129, 0.8) 100%)',
                          boxShadow: '0 8px 32px rgba(52, 211, 153, 0.3)'
                        }}
                      >
                        <div className="absolute inset-0 bg-white/20 blur-md group-hover:bg-white/30 transition-all duration-300" />
                        <div className="relative bg-[#06060a]/90 backdrop-blur-xl rounded-xl px-8 py-5 flex items-center justify-center gap-3 transition-all duration-300 group-hover:bg-transparent">
                        {isFinishing ? (
                          <span className="flex items-center justify-center gap-3 text-white font-display text-[var(--text-lg)] font-800 tracking-wide uppercase">
                            <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                            Finishing...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-3 text-white font-display text-[var(--text-xl)] font-900 tracking-wide uppercase">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Complete
                          </span>
                        )}
                        </div>
                      </button>
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

  // Welcome back screen (device recognized, was checked out)
  if (welcomeBack) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[#06060a]" />
        <div className="absolute inset-0 opacity-40" style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(77, 141, 255, 0.06) 0%, transparent 70%)'
        }} />

        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.03] animate-float" style={{
          background: 'radial-gradient(circle, rgba(77, 141, 255, 0.4) 0%, transparent 70%)',
          filter: 'blur(80px)'
        }} />

        <div className="relative z-10 w-full max-w-[480px] px-8">
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="relative">
              <div className="absolute -inset-2 rounded-3xl opacity-60" style={{
                background: 'radial-gradient(ellipse at center, rgba(77, 141, 255, 0.08) 0%, transparent 70%)',
                filter: 'blur(24px)'
              }} />

              <div className="relative glass-luxury rounded-3xl px-6 py-12 md:px-12 md:py-16 text-center shadow-2xl border border-[var(--border-subtle)] backdrop-blur-2xl">
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(77, 141, 255, 0.04) 0%, transparent 60%)'
                  }} />
                </div>

                <div className="relative">
                  <div className="mb-6">
                    <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center" style={{
                      background: 'linear-gradient(135deg, rgba(77, 141, 255, 0.1) 0%, rgba(77, 141, 255, 0.03) 100%)',
                      border: '1px solid rgba(77, 141, 255, 0.12)'
                    }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  </div>

                  <h1 className="font-display text-[var(--text-4xl)] font-900 tracking-[-0.04em] uppercase mb-4" style={{ color: 'var(--text-primary)' }}>
                    Welcome back
                  </h1>
                  <p className="text-[var(--text-xl)] font-light tracking-wide mb-2 opacity-90" style={{ color: 'var(--text-primary)' }}>
                    {registeredName}
                  </p>
                  <p className="text-[var(--text-base)] tracking-wide mb-8" style={{ color: 'var(--text-ghost)' }}>
                    Ready to re-join the queue?
                  </p>

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
                    onClick={handleReJoin}
                    disabled={isSubmitting}
                    className="premium-button w-full"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-3">
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        Joining...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Re-Join Queue
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </span>
                    )}
                  </button>

                  <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <p className="text-[11px] tracking-wide" style={{ color: 'var(--text-ghost)' }}>
                      {office}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Name form (first-time or unrecognized device)
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

          <h1 className="font-display text-[var(--text-5xl)] font-900 tracking-[-0.05em] uppercase mb-4" style={{ color: 'var(--text-primary)' }}>
            Check-In
          </h1>
          <p className="text-[var(--text-lg)] tracking-wide mb-6 opacity-80" style={{ color: 'var(--text-muted)' }}>
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

            <div className="glass-luxury rounded-3xl px-6 py-12 md:px-12 md:py-16 relative shadow-2xl border border-[var(--border-subtle)] backdrop-blur-2xl">
              <div className="absolute top-0 left-10 right-10 h-px" style={{
                background: 'linear-gradient(90deg, transparent, rgba(232, 175, 74, 0.12), transparent)'
              }} />

              <form onSubmit={handleSubmit}>
                <div className="mb-8">
                  <label className="block text-[var(--text-sm)] font-bold mb-4 tracking-[0.2em] uppercase" style={{ color: 'var(--text-ghost)' }}>
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
                  Your device is remembered for faster check-in
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
