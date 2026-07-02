'use client';

import { useState, useEffect, useRef, useCallback, Suspense, useMemo, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import ScanBackground from '@/components/ScanBackground';

function generateDeviceId(): string {
  return crypto.randomUUID();
}

function getDeviceTokenKey(office: string): string {
  return `device_token_${office}`;
}

function getSavedNameKey(office: string): string {
  return `driverName_${office}`;
}

function isArabicOffice(office: string): boolean {
  const arabicOffices = ['QCA1', 'QCA2', 'QCA3'];
  return arabicOffices.includes(office.toUpperCase());
}

const t = (office: string) => {
  const ar = isArabicOffice(office);
  return {
    dir: ar ? 'rtl' : 'ltr' as const,
    lang: ar ? 'ar' : 'en',
    checkIn: ar ? 'تسجيل الدخول' : 'Check-In',
    enterName: ar ? 'أدخل اسمك للانضمام للطابور' : 'Enter your name to join the queue',
    fullName: ar ? 'الاسم الكامل' : 'Full Name',
    placeholder: ar ? 'محمد أحمد' : 'Ahmed Mohammed',
    checkingIn: ar ? 'جاري التسجيل...' : 'Checking in...',
    submit: ar ? 'تسجيل' : 'Check In',
    deviceRemembered: ar ? 'جهازك محفوظ لتسجيل أسرع' : 'Your device is remembered for faster check-in',
    welcomeBack: ar ? 'مرحباً بعودتك' : 'Welcome back',
    readyToRejoin: ar ? 'هل أنت مستعد للانضمام مرة أخرى؟' : 'Ready to re-join the queue?',
    rejoinQueue: ar ? 'الانضمام مرة أخرى' : 'Re-Join Queue',
    joining: ar ? 'جاري الانضمام...' : 'Joining...',
    youreUp: ar ? 'أنت التالي!' : "You're up!",
    managerReady: ar ? 'المدير جاهز لك' : 'the manager is ready for you',
    goToDock: ar ? 'اذهب إلى الرصيف' : 'Go to dock',
    youreNext: ar ? 'أنت التالي!' : "You're next!",
    inTheQueue: ar ? 'في الطابور' : 'In the queue',
    getReady: ar ? 'استعد — سيتم استدعاؤك قريباً' : "get ready — you'll be called shortly",
    driverAhead: (n: number) => ar
      ? `${n} سائق أمامك`
      : n === 1 ? '1 driver ahead of you' : `${n} drivers ahead of you`,
    positionOf: (p: number, total: number) => ar
      ? `الموضع ${p} من ${total}`
      : `Position ${p} of ${total}`,
    nextUp: ar ? 'التالي' : 'Next up',
    waiting: ar ? 'في الانتظار' : 'Waiting',
    onBreak: ar ? 'في الاستراحة' : 'On Break',
    breakReturnsIn: ar ? 'يعود خلال' : 'Returns in',
    breakEndsAt: ar ? 'ينتهي الاستراحة في' : 'Break ends at',

    networkError: ar ? 'خطأ في الاتصال — تحقق من اتصالك' : 'Network error — check your connection',
    nameRequired: ar ? 'يرجى إدخال اسمك' : 'Please enter your name',
    deviceMismatch: (name: string) => ar
      ? `هذا الجهاز مسجل باسم ${name}`
      : `This device is already registered to ${name}`,
    alreadyInQueue: ar ? 'أنت بالفعل في الطابور. انتظر حتى يتحقق منك المدير.' : 'You are already in the queue. Wait for the manager to check you out.',
    failedToRejoin: ar ? 'فشل في الانضمام' : 'Failed to re-join',
    myProfile: ar ? 'ملفي الشخصي' : 'My Profile',
    viewStats: ar ? 'عرض إحصائياتي' : 'View my stats',
  };
};

function ParticleBurst() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="particle" />
      ))}
    </div>
  );
}

function ScanContent() {
  const searchParams = useSearchParams();
  const office = searchParams.get('office') || 'QCA2';
  const lang = useMemo(() => t(office), [office]);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [aheadCount, setAheadCount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [checkedOut, setCheckedOut] = useState(false);
  const [deviceLoading, setDeviceLoading] = useState(true);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [onBreak, setOnBreak] = useState(false);
  const [breakRemainingMs, setBreakRemainingMs] = useState(0);
  const [stateKey, setStateKey] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [driverAccountId, setDriverAccountId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const deviceIdRef = useRef<string>('');

  const triggerTransition = useCallback(() => {
    setStateKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem(getDeviceTokenKey(office));
    if (storedToken) {
      deviceIdRef.current = storedToken;
    } else {
      const newToken = generateDeviceId();
      deviceIdRef.current = newToken;
      localStorage.setItem(getDeviceTokenKey(office), newToken);
    }

    const savedName = localStorage.getItem(getSavedNameKey(office));
    if (savedName) {
      setName(savedName); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage read on mount
    }

    setTimeout(() => inputRef.current?.focus(), 600);
  }, [office]);

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
            setDisplayName(data.driver.name);
            setPosition(data.position);
            setAheadCount(data.position - 1);
            setTotal(data.total);
            setDriverAccountId(data.driver.driver_account_id || null);
            setSubmitted(true);
          } else if (data.status === 'on_break') {
            setDisplayName(data.driver.name);
            setDriverAccountId(data.driver.driver_account_id || null);
            setOnBreak(true);
            setBreakRemainingMs(data.break_remaining_ms || 0);
            setPosition(data.position);
            setAheadCount(data.position - 1);
            setTotal(data.total);
          } else if (data.status === 'checked_out') {
            setRegisteredName(data.driver.name);
            setDriverAccountId(data.driver.driver_account_id || null);
            setWelcomeBack(true);
            setDisplayName(data.driver.name);
          }
        }
      } catch {
        // Network error
      } finally {
        setDeviceLoading(false);
      }
    };

    checkDevice();
  }, [office, mounted]);

  useEffect(() => {
    if (!onBreak) return;

    const interval = setInterval(() => {
      setBreakRemainingMs((prev) => {
        if (prev <= 1000) {
          setOnBreak(false);
          setSubmitted(true);
          triggerTransition();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onBreak, triggerTransition]);

  useEffect(() => {
    if (!submitted || checkedOut || onBreak) return;

    const checkPosition = async () => {
      try {
        const res = await fetch(
          `/api/drivers/position?device_id=${deviceIdRef.current}&office=${office}`
        );
        const data = await res.json();

        if (!data.found) {
          setCheckedOut(true);
          triggerTransition();
          return;
        }

        if (data.status === 'checked_out') {
          setCheckedOut(true);
          triggerTransition();
          return;
        }

        setTotal(data.total);
        setPosition(data.position);
        setAheadCount(data.position - 1);
      } catch {
        // retry next interval
      }
    };

    checkPosition();
    const interval = setInterval(checkPosition, 3000);
    return () => clearInterval(interval);
  }, [submitted, checkedOut, onBreak, triggerTransition, office]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError(lang.nameRequired);
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
        setDisplayName(trimmed);
        setPosition(data.position);
        setAheadCount(data.position - 1);
        setTotal(data.total);
        setDriverAccountId(data.driver_account_id || null);
        setSubmitted(true);
        triggerTransition();
      } else if (data.error === 'device_mismatch') {
        setError(lang.deviceMismatch(data.registered_name));
      } else if (data.error === 'already_in_queue') {
        setDisplayName(data.driver.name);
        setPosition(data.position);
        setAheadCount(data.position - 1);
        setTotal(data.total);
        setDriverAccountId(data.driver_account_id || null);
        setSubmitted(true);
        triggerTransition();
      } else {
        setError(data.error || `Server error (${res.status})`);
      }
    } catch {
      setError(lang.networkError);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, office, lang, triggerTransition]);

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
        setDisplayName(registeredName);
        setPosition(data.position);
        setAheadCount(data.position - 1);
        setTotal(data.total);
        setDriverAccountId(data.driver_account_id || null);
        setWelcomeBack(false);
        setSubmitted(true);
        triggerTransition();
      } else {
        setError(data.error || lang.failedToRejoin);
      }
    } catch {
      setError(lang.networkError);
    } finally {
      setIsSubmitting(false);
    }
  }, [registeredName, office, lang, triggerTransition]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError('');
  }, []);

  const handleRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, []);

  const animateIn = mounted ? 'scan-state-enter' : 'scan-hidden';

  // Loading state
  if (deviceLoading) {
    return (
      <ScanBackground accent="gold" grid>
        <div className="scan-shimmer" />
      </ScanBackground>
    );
  }

  // Checked out screen
  if (submitted && checkedOut) {
    return (
      <ScanBackground accent="green">
        <div key={stateKey} className={animateIn}>
          <div className="scan-card-wrapper">
            <div className="scan-card-glow" style={{
              background: 'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.08) 0%, transparent 70%)'
            }} />
            <div className="scan-card">
              <div className="scan-card-inner-glow" style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(52, 211, 153, 0.04) 0%, transparent 60%)'
              }} />

              <div className="scan-card-content">
                <div className="relative">
                  <div className="scan-icon-ring animate-success-ring scan-icon-ring-pulse" style={{
                    background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(52, 211, 153, 0.03) 100%)',
                    borderColor: 'rgba(52, 211, 153, 0.12)'
                  }}>
                    <div className="scan-icon-circle animate-success-check" style={{
                      background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
                      boxShadow: '0 0 40px rgba(52, 211, 153, 0.15), 0 8px 24px -4px rgba(52, 211, 153, 0.2)'
                    }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                  <ParticleBurst />
                </div>

                <h1 className="scan-title stagger-1">{lang.youreUp}</h1>
                <p className="scan-subtitle stagger-2">{displayName}, {lang.managerReady}</p>

                <div className="scan-divider stagger-3" style={{
                  background: 'linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.2), transparent)'
                }} />

                <div className="scan-status-badge scan-status-go stagger-4">
                  <div className="scan-status-dot" style={{ background: '#34d399' }} />
                  <span>{lang.goToDock}</span>
                </div>

                {driverAccountId && (
                  <a
                    href={`/driver?id=${driverAccountId}`}
                    className="scan-profile-link stagger-5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>{lang.myProfile}</span>
                  </a>
                )}

                <div className="scan-office-badge stagger-6">
                  <span>{office}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScanBackground>
    );
  }

  // On Break screen
  if (onBreak) {
    const mins = Math.floor(breakRemainingMs / 60000);
    const secs = Math.floor((breakRemainingMs % 60000) / 1000);

    return (
      <ScanBackground accent="gold" grid>
        <div key={stateKey} className={animateIn}>
          <div className="scan-card-wrapper">
            <div className="scan-card-glow" style={{
              background: 'radial-gradient(ellipse at center, rgba(232, 175, 74, 0.08) 0%, transparent 70%)'
            }} />
            <div className="scan-card">
              <div className="scan-card-inner-glow" style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(232, 175, 74, 0.04) 0%, transparent 60%)'
              }} />

              <div className="scan-card-content">
                <div className="scan-icon-ring stagger-1" style={{
                  background: 'linear-gradient(135deg, rgba(232, 175, 74, 0.1) 0%, rgba(232, 175, 74, 0.03) 100%)',
                  borderColor: 'rgba(232, 175, 74, 0.12)'
                }}>
                  <div className="scan-icon-circle" style={{
                    background: 'linear-gradient(135deg, rgba(232, 175, 74, 0.15) 0%, rgba(232, 175, 74, 0.05) 100%)'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                </div>

                <h1 className="scan-title stagger-2">{lang.onBreak}</h1>
                <p className="scan-subtitle stagger-3">{displayName}</p>

                <div className="scan-divider stagger-3" style={{
                  background: 'linear-gradient(90deg, transparent, rgba(232, 175, 74, 0.2), transparent)'
                }} />

                <div className="scan-position-wrapper stagger-4">
                  <div className="scan-position-ring scan-position-ring-animated" style={{
                    '--ring-color': 'var(--accent-gold)',
                    '--ring-glow': 'rgba(232, 175, 74, 0.3)',
                  } as React.CSSProperties}>
                    <span className="scan-position-number" style={{
                      color: 'var(--accent-gold)',
                      textShadow: '0 0 60px rgba(232, 175, 74, 0.3)',
                      fontSize: 'clamp(3rem, 10vw, 5rem)',
                    }}>
                      {mins}:{secs.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="scan-position-total" style={{ color: 'rgba(232, 175, 74, 0.6)' }}>
                    {lang.breakReturnsIn}
                  </div>
                </div>

                <div className="scan-status-badge scan-status-waiting stagger-5"
                  style={{
                    background: 'rgba(232, 175, 74, 0.06)',
                    borderColor: 'rgba(232, 175, 74, 0.12)',
                    marginTop: '24px',
                  }}>
                  <div className="scan-status-dot animate-pulse" style={{ background: 'var(--accent-gold)' }} />
                  <span style={{ color: 'var(--accent-gold)' }}>
                    {lang.waiting}
                  </span>
                </div>

                <div className="scan-office-badge stagger-6">
                  <span>{office}</span>
                </div>

                {driverAccountId && (
                  <a
                    href={`/driver?id=${driverAccountId}`}
                    className="scan-profile-link stagger-7"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>{lang.myProfile}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScanBackground>
    );
  }

  // Queue position screen
  if (submitted) {
    const isNext = position === 1;
    const accentColor = isNext ? '#34d399' : 'var(--accent-gold)';

    return (
      <ScanBackground accent={isNext ? 'green' : 'gold'}>
        <div key={stateKey} className={animateIn}>
          <div className="scan-card-wrapper">
            <div className="scan-card-glow" style={{
              background: isNext
                ? 'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.08) 0%, transparent 70%)'
                : 'radial-gradient(ellipse at center, rgba(232, 175, 74, 0.08) 0%, transparent 70%)'
            }} />
            <div className="scan-card">
              <div className="scan-card-inner-glow" style={{
                background: isNext
                  ? 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(52, 211, 153, 0.04) 0%, transparent 60%)'
                  : 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(232, 175, 74, 0.04) 0%, transparent 60%)'
              }} />

              <div className="scan-card-content">
                {position !== null ? (
                  <div className={`scan-position-wrapper stagger-1 ${isNext ? 'animate-scale-in' : ''}`}>
                    <div className="scan-position-ring scan-position-ring-animated" style={{
                      '--ring-color': accentColor,
                      '--ring-glow': isNext ? 'rgba(52, 211, 153, 0.3)' : 'rgba(232, 175, 74, 0.3)',
                    } as React.CSSProperties}>
                      <span className="scan-position-number" style={{
                        color: accentColor,
                        textShadow: isNext
                          ? '0 0 60px rgba(52, 211, 153, 0.3)'
                          : '0 0 60px rgba(232, 175, 74, 0.3)'
                      }}>
                        {position}
                      </span>
                    </div>
                    {total > 0 && (
                      <div className="scan-position-total" style={{ color: `${accentColor}99` }}>
                        {lang.positionOf(position, total)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="scan-position-loading stagger-1" />
                )}

                <h1 className="scan-title stagger-2">
                  {isNext ? lang.youreNext : lang.inTheQueue}
                </h1>
                <p className="scan-subtitle stagger-3">
                  {displayName}, {isNext
                    ? lang.getReady
                    : lang.driverAhead(aheadCount)
                  }
                </p>

                <div className="scan-divider stagger-3" style={{
                  background: `linear-gradient(90deg, transparent, ${accentColor}33, transparent)`
                }} />

                <div className={`scan-status-badge ${isNext ? 'scan-status-next' : 'scan-status-waiting'} stagger-4`}
                  style={{
                    background: `${accentColor}0a`,
                    borderColor: `${accentColor}1a`,
                  }}>
                  <div className="scan-status-dot animate-pulse" style={{ background: accentColor }} />
                  <span style={{ color: accentColor }}>
                    {isNext ? lang.nextUp : lang.waiting}
                  </span>
                </div>

                {position !== null && position > 1 && (
                  <div className="scan-progress stagger-5">
                    {Array.from({ length: Math.min(position, 10) }, (_, i) => (
                      <div
                        key={i}
                        className="scan-progress-dot"
                        style={{
                          width: i === 0 ? '24px' : '6px',
                          height: '6px',
                          background: i === 0 ? accentColor : `${accentColor}30`,
                          borderRadius: i === 0 ? '3px' : '50%',
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="scan-office-badge stagger-6">
                  <span>{office}</span>
                </div>

                {driverAccountId && (
                  <a
                    href={`/driver?id=${driverAccountId}`}
                    className="scan-profile-link stagger-7"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>{lang.myProfile}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScanBackground>
    );
  }

  // Welcome back screen
  if (welcomeBack) {
    return (
      <ScanBackground accent="blue" grid>
        <div key={stateKey} className={animateIn}>
          <div className="scan-card-wrapper">
            <div className="scan-card-glow" style={{
              background: 'radial-gradient(ellipse at center, rgba(77, 141, 255, 0.08) 0%, transparent 70%)'
            }} />
            <div className="scan-card">
              <div className="scan-card-inner-glow" style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(77, 141, 255, 0.04) 0%, transparent 60%)'
              }} />

              <div className="scan-card-content">
                <div className="scan-icon-ring stagger-1" style={{
                  background: 'linear-gradient(135deg, rgba(77, 141, 255, 0.1) 0%, rgba(77, 141, 255, 0.03) 100%)',
                  borderColor: 'rgba(77, 141, 255, 0.12)'
                }}>
                  <div className="scan-icon-circle" style={{
                    background: 'linear-gradient(135deg, rgba(77, 141, 255, 0.15) 0%, rgba(77, 141, 255, 0.05) 100%)'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                </div>

                <h1 className="scan-title stagger-2">{lang.welcomeBack}</h1>
                <p className="scan-name-display stagger-3">{registeredName}</p>
                <p className="scan-subtitle stagger-3" style={{ marginBottom: '32px' }}>{lang.readyToRejoin}</p>

                {error && (
                  <div className="scan-error animate-shake stagger-4">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="scan-error-icon">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={(e) => { handleReJoin(); handleRipple(e); }}
                  disabled={isSubmitting}
                  className="scan-cta-button scan-cta-gold ripple-container stagger-4"
                >
                  <div className="scan-cta-glow" />
                  <div className="scan-cta-inner scan-cta-dark">
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        <span>{lang.joining}</span>
                      </>
                    ) : (
                      <>
                        <span>{lang.rejoinQueue}</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </>
                    )}
                  </div>
                </button>

                {driverAccountId && (
                  <a
                    href={`/driver?id=${driverAccountId}`}
                    className="scan-profile-link stagger-5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>{lang.viewStats}</span>
                  </a>
                )}

                <div className="scan-office-badge stagger-5">
                  <span>{office}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScanBackground>
    );
  }

  // Name form
  return (
    <ScanBackground accent="gold" grid>
      <div key={stateKey} className={`scan-header ${mounted ? 'scan-visible' : 'scan-hidden'}`}>
        <div className="scan-brand stagger-1">
          <div className="scan-brand-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <path d="M9 17h6" />
              <circle cx="17" cy="17" r="2" />
            </svg>
            <div className="scan-brand-icon-glow" />
          </div>
        </div>

        <h1 className="scan-main-title stagger-2">{lang.checkIn}</h1>
        <p className="scan-main-subtitle stagger-3">{lang.enterName}</p>

        <div className="scan-office-badge stagger-4">
          <span>{office}</span>
        </div>
      </div>

      <div className={`scan-card-wrapper ${mounted ? 'scan-visible-delayed' : 'scan-hidden'}`}>
        <div className="scan-card-glow scan-card-glow-gold" />
        <div className="scan-card">
          <div className="scan-card-top-line" />

          <form onSubmit={handleSubmit} className="scan-card-content">
            <div className="scan-field stagger-5">
              <label className="scan-label">{lang.fullName}</label>
              <div className="scan-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder={lang.placeholder}
                  className="scan-input"
                  autoComplete="name"
                  dir="ltr"
                />
                <div className="scan-input-focus-ring" />
              </div>
            </div>

            {error && (
              <div className="scan-error animate-shake stagger-6">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="scan-error-icon">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="scan-cta-button scan-cta-gold ripple-container stagger-6"
              onClick={handleRipple}
            >
              <div className="scan-cta-glow" />
              <div className="scan-cta-inner scan-cta-dark">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    <span>{lang.checkingIn}</span>
                  </>
                ) : (
                  <>
                    <span>{lang.submit}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="scan-card-footer stagger-7">
            <p>{lang.deviceRemembered}</p>
          </div>
        </div>
      </div>
    </ScanBackground>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <ScanBackground accent="gold">
        <div className="scan-shimmer" />
      </ScanBackground>
    }>
      <ScanContent />
    </Suspense>
  );
}
