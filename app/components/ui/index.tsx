import {
  useState, useRef, useEffect, useLayoutEffect, useSyncExternalStore, useId,
  type ReactNode, type ReactElement, type CSSProperties, type MouseEventHandler,
  type MouseEvent as ReactMouseEvent, type ChangeEventHandler, type HTMLInputTypeAttribute,
  type InputHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

// Shared icon set lives next to the primitives that use it (e.g. PScanLink).
// eslint-disable-next-line react-refresh/only-export-components
export const Icons = {
  comment: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 12a8.5 8.5 0 01-12.6 7.4L3 21l1.6-5.1A8.5 8.5 0 1121 12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
  feed: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.7"/><path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  dash: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7"/><rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.7"/><rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="1.7"/><rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7"/></svg>,
  primary: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-6 9 6v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 21v-7h6v7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
  secondary: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  token: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v10M9.5 9.5h3.75a1.75 1.75 0 110 3.5H9.5h4.25a1.75 1.75 0 110 3.5H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  wallet: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.7"/><circle cx="16.5" cy="12" r="1.3" fill="currentColor"/><path d="M2 9.5h20" stroke="currentColor" strokeWidth="1.5"/></svg>,
  swap: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M16 3l4 4-4 4M20 7H7M8 21l-4-4 4-4M4 17h13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  academy: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 4L2 9l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" stroke="currentColor" strokeWidth="1.7"/><path d="M22 9v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  profile: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  help: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M9.5 9a2.5 2.5 0 115 0c0 1.7-2.5 2-2.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1" fill="currentColor"/></svg>,
  admin: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  bell: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  sun: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.7"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  moon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
  search: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.7"/><path d="M21 21l-3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  ext: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M15 3h6v6M21 3l-10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevR: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevD: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  back: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
  doc: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  lock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.7"/></svg>,
  tax: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 14l6-6M9.5 9.5h.01M14.5 13.5h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7"/></svg>,
  receive: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  send: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  location: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.7"/></svg>,
  clock: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  settings: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.5"/></svg>,
  logout: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  star: <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  users: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  trophy: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M5 3H3a2 2 0 000 4c0 2 1.5 4 3 5M19 3h2a2 2 0 010 4c0 2-1.5 4-3 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M12 17c-4 0-7-3-7-7V3h14v7c0 4-3 7-7 7z" stroke="currentColor" strokeWidth="1.7"/></svg>,
} as const satisfies Record<string, ReactElement>;

export type IconName = keyof typeof Icons;

export type PCardProps = {
  children?: ReactNode;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string;
  /** Anchor name for the guided tours (`data-guide`). */
  guide?: string;
};

export function PCard({ children, style = {}, onClick, className = '', guide }: PCardProps) {
  return (
    <motion.div
      data-guide={guide}
      onClick={onClick}
      whileHover={onClick ? { y: -2, boxShadow: 'var(--sh-lg)' } : undefined}
      transition={{ duration: 0.15 }}
      className={className}
      style={{
        background: 'var(--surface)',
        backdropFilter: 'blur(2px) saturate(140%)',
        WebkitBackdropFilter: 'blur(2px) saturate(140%)',
        borderRadius: 20,
        boxShadow: 'var(--sh-md)',
        border: '1px solid var(--border-l)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

export type PBtnVariant = 'primary' | 'accent' | 'secondary' | 'ghost';

export type PBtnProps = {
  children?: ReactNode;
  variant?: PBtnVariant;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  style?: CSSProperties;
  small?: boolean;
  disabled?: boolean;
  /** Anchor name for the guided tours (`data-guide`). */
  guide?: string;
};

export function PBtn({ children, variant = 'primary', onClick, style = {}, small, disabled, guide }: PBtnProps) {
  const variants: Record<PBtnVariant, CSSProperties> = {
    primary:   { background: 'var(--text)',    color: 'var(--bg)' },
    accent:    { background: 'var(--accent)',  color: 'var(--accent-fg)' },
    secondary: { background: 'transparent',   color: 'var(--text)', border: '1.5px solid var(--border)' },
    ghost:     { background: 'var(--surface2)', color: 'var(--text)' },
  };
  return (
    <motion.button
      data-guide={guide}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ opacity: 0.88 }}
      whileTap={{ scale: 0.97 }}
      style={{
        padding: small ? '9px 16px' : '13px 22px',
        borderRadius: small ? 11 : 13,
        fontFamily: 'var(--font-b)',
        fontSize: small ? 13 : 14,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
        transition: 'opacity 0.15s',
        opacity: disabled ? 0.5 : 1,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

export type PTagColor = 'neutral' | 'green' | 'red' | 'dark' | 'purple' | 'blue';

export type PTagProps = {
  label?: ReactNode;
  color?: PTagColor;
  style?: CSSProperties;
};

export function PTag({ label, color = 'neutral', style = {} }: PTagProps) {
  const map: Record<PTagColor, [bg: string, fg: string]> = {
    neutral: ['var(--surface2)', 'var(--sec)'],
    green:   ['var(--accent-bg)', 'var(--accent-text)'],
    red:     ['var(--neg-bg)', 'var(--neg)'],
    dark:    ['rgba(10,12,16,0.78)', '#fff'],
    purple:  ['rgba(130,71,229,0.14)', '#8247E5'],
    blue:    ['rgba(39,117,202,0.14)', '#2775CA'],
  };
  const [bg, tc] = map[color] || map.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999,
      background: bg, color: tc,
      fontSize: 11, fontWeight: 600,
      fontFamily: 'var(--font-b)', whiteSpace: 'nowrap', ...style,
    }}>{label}</span>
  );
}

export type PChipProps = {
  label?: ReactNode;
  active?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function PChip({ label, active, onClick }: PChipProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      style={{
        padding: '7px 16px', borderRadius: 999, cursor: 'pointer',
        border: active ? '1.5px solid transparent' : '1.5px solid var(--border)',
        background: active ? 'var(--text)' : 'transparent',
        color: active ? 'var(--bg)' : 'var(--sec)',
        fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 500,
        whiteSpace: 'nowrap', flexShrink: 0,
        transition: 'all 0.18s',
      }}
    >{label}</motion.button>
  );
}

export type PProgressProps = {
  value: number;
  style?: CSSProperties;
  color?: string;
};

export function PProgress({ value, style = {}, color }: PProgressProps) {
  return (
    <div style={{ width: '100%', height: 5, borderRadius: 999, background: 'var(--surface2)', overflow: 'hidden', ...style }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ height: '100%', background: color || 'var(--accent)', borderRadius: 999 }}
      />
    </div>
  );
}

export type PDivProps = { style?: CSSProperties };

export function PDiv({ style = {} }: PDivProps) {
  return <div style={{ height: 1, background: 'var(--border-l)', ...style }} />;
}

const VINYL_RING = (angle: number): string =>
  `conic-gradient(from ${angle}deg,
    #1c1c1e 0%, #2e2e30 5%,
    #7a6050 8%, #d4a843 10.5%, #fff5cc 11.5%, #c8902a 12.5%, #2a1a0a 16%,
    #1a1a22 24%, #0e1828 33%,
    #1a3a52 39%, #00c2d4 42.5%, #b0eef8 43.5%, #00a0b8 45%, #0e1828 49%,
    #16102a 59%, #3a1860 63.5%, #9040d0 66%, #d090ff 67%, #6030a8 68.5%,
    #1a1222 73%, #1c1c22 84%, #1c1c1e 100%)`;

export type PAvatarProps = {
  name?: string;
  size?: number;
  gradient?: string;
};

export function PAvatar({ name = 'U', size = 36, gradient }: PAvatarProps) {
  const [angle, setAngle] = useState(0);
  const [hovering, setHovering] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const curAngle = useRef(0);

  useEffect(() => {
    if (hovering) { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); return; }
    const tick = () => {
      curAngle.current = (curAngle.current + 0.18) % 360;
      setAngle(curAngle.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [hovering]);

  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const deg = (Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI + 360) % 360;
    curAngle.current = deg;
    setAngle(deg);
  };

  const bg = gradient || 'linear-gradient(135deg, var(--av1) 0%, var(--av2) 100%)';
  const total = size + 7;

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{ width: total, height: total, borderRadius: '50%', position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Vinyl ring */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: VINYL_RING(angle) }} />
      {/* Dark gap between ring and avatar */}
      <div style={{ position: 'absolute', inset: '1.5px', borderRadius: '50%', background: '#0d0d0f' }} />
      {/* Avatar */}
      <div style={{
        width: size, height: size, borderRadius: '50%', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: size * 0.38, color: 'var(--text)',
        position: 'relative', zIndex: 1,
      }}>{name[0].toUpperCase()}</div>
    </div>
  );
}

// Current <html data-theme>, kept in sync with a MutationObserver. Prerendered
// HTML assumes the default dark theme.
function subscribeTheme(onChange: () => void): () => void {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}
const readTheme = (): string => document.documentElement.getAttribute('data-theme') || 'dark';

export type PLogoProps = { size?: number };

export function PLogo({ size = 15 }: PLogoProps) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'dark');
  const [loaded, setLoaded] = useState<string | null>(null); // src of the logo that finished loading
  const preRef = useRef<HTMLImageElement>(null);
  const h = size * 2.8;

  const src = theme === 'dark' ? '/logo-dark.png' : '/logo-light.png';
  const imgOk = loaded === src;

  // The hidden preload may finish before hydration attaches onLoad.
  useEffect(() => {
    const el = preRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(src);
  }, [src]);

  return (
    <span style={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
      {imgOk ? (
        <img
          key={src}
          src={src}
          alt="Brikme"
          style={{ height: h, width: 'auto', objectFit: 'contain' }}
          onError={() => setLoaded(null)}
        />
      ) : (
        <>
          {/* Hidden preload — shows the logo once the file exists */}
          <img ref={preRef} key={src + '-pre'} src={src} alt="" style={{ display: 'none' }}
            onLoad={() => setLoaded(src)} onError={() => setLoaded(null)}
          />
          <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: size, letterSpacing: '-0.04em', color: 'var(--text)', whiteSpace: 'nowrap' }}>
            Brikme
          </span>
        </>
      )}
    </span>
  );
}

export type PInputProps = {
  placeholder?: string;
  value?: InputHTMLAttributes<HTMLInputElement>['value'];
  onChange?: ChangeEventHandler<HTMLInputElement>;
  style?: CSSProperties;
  type?: HTMLInputTypeAttribute;
  prefix?: ReactNode;
  /** Accessible name when there is no visible <label> (no visual effect). */
  ariaLabel?: string;
  name?: string;
  autoComplete?: string;
  maxLength?: number;
};

export function PInput({ placeholder, value, onChange, style = {}, type = 'text', prefix, ariaLabel, name, autoComplete, maxLength }: PInputProps) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {prefix && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--ter)' }}>{prefix}</span>}
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange}
        aria-label={ariaLabel ?? placeholder} name={name} autoComplete={autoComplete} maxLength={maxLength}
        style={{
          background: 'var(--surface)', borderRadius: 12,
          padding: `12px ${prefix ? '16px 12px 32px' : '16px'}`,
          border: '1.5px solid var(--border)', width: '100%', boxSizing: 'border-box',
          fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', outline: 'none', ...style,
        }}
      />
    </div>
  );
}

export type PStatProps = {
  label?: ReactNode;
  value?: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
  style?: CSSProperties;
  /** Anchor name for the guided tours (`data-guide`). */
  guide?: string;
};

export function PStat({ label, value, sub, accent, style = {}, guide }: PStatProps) {
  return (
    <div data-guide={guide} style={{ display: 'flex', flexDirection: 'column', gap: 3, ...style }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-b)', color: 'var(--ter)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 700, color: accent ? 'var(--accent-text)' : 'var(--text)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, fontFamily: 'var(--font-b)', color: 'var(--sec)' }}>{sub}</div>}
    </div>
  );
}

export type PImgProps = {
  src?: string;
  alt?: string;
  height?: CSSProperties['height'];
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
  /** Above-the-fold image (likely LCP): load eagerly with high priority. */
  priority?: boolean;
};

export function PImg({ src, alt, height = 180, style = {}, className, children, priority = false }: PImgProps) {
  const [ok, setOk] = useState(true);
  return (
    <div className={className} style={{ width: '100%', height, position: 'relative', overflow: 'hidden', background: 'var(--surface2)', flexShrink: 0, ...style }}>
      {ok && (
        <img
          src={src} alt={alt ?? ''} onError={() => setOk(false)} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {children}
    </div>
  );
}

// ─── Company identity (avatar + name + category) ───────────────────────────
// Replaces the old text-only issuer badges ("Brikme"/"Verificado"/
// "Comunidad") across market cards — no real company logos in this data set,
// so each company gets a stable placeholder avatar (first letter, color
// hashed from its name so the same company always gets the same color).
const COMPANY_COLORS = ['#8B5A2B', '#4A5568', '#2B6CB0', '#6B46C1', '#0F766E', '#9D4B16', '#B7245C', '#3F6212'];
function hashStr(s: string = ''): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Companies are hexagons everywhere (people — users, sellers — are circles).
export const HEX_CLIP = 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)';

// Brikme itself (asset.issuer === 'keychain') isn't just another company —
// it gets its own logo mark instead of a lettered avatar. Solid black (not
// the silver/black gradient used elsewhere) so the light-colored logo image
// reads clearly instead of washing out against the gradient's lighter end.
export type CompanyAvatarProps = {
  company?: string;
  size?: number;
  style?: CSSProperties;
};

export function CompanyAvatar({ company, size = 28, style = {} }: CompanyAvatarProps) {
  const isKeychain = company === 'BRIKME';
  const initial = (company || '?').trim().slice(0, 1).toUpperCase();
  const bg = isKeychain ? '#000' : COMPANY_COLORS[hashStr(company) % COMPANY_COLORS.length];
  return (
    <div style={{
      width: size, height: size, clipPath: HEX_CLIP, background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: size * 0.42, ...style,
    }}>
      {isKeychain
        ? <img src="/iconow.png" alt="Brikme" style={{ width: size * 0.62, height: size * 0.62, objectFit: 'contain' }} />
        : initial}
    </div>
  );
}

// variant 'surface' sits on var(--surface) (theme-aware colors); 'overlay'
// sits directly on a photo (always white, with a text-shadow for contrast).
export type CompanyTagProps = {
  company?: string;
  cat?: ReactNode;
  size?: 'sm' | 'md';
  variant?: 'surface' | 'overlay';
  style?: CSSProperties;
};

export function CompanyTag({ company, cat, size = 'md', variant = 'surface', style = {} }: CompanyTagProps) {
  const avatarSize = size === 'sm' ? 22 : 28;
  const nameSize = size === 'sm' ? 11.5 : 13;
  const catSize = size === 'sm' ? 10 : 11.5;
  const overlay = variant === 'overlay';
  const nameColor = overlay ? '#fff' : 'var(--text)';
  const catColor = overlay ? 'rgba(255,255,255,0.72)' : 'var(--ter)';
  const textShadow = overlay ? '0 1px 3px rgba(0,0,0,0.55)' : 'none';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <CompanyAvatar company={company} size={avatarSize} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: nameSize, color: nameColor, textShadow, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{company}</span>
        <span style={{ fontFamily: 'var(--font-b)', fontSize: catSize, color: catColor, textShadow }}>{cat}</span>
      </div>
    </div>
  );
}

export type PAreaProps = {
  data: number[];
  color?: string;
  height?: number;
  id?: string;
};

export function PArea({ data, color, height = 80, id }: PAreaProps) {
  const W = 320, H = height;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, H - ((v - min) / range) * (H - 14) - 7]);
  const linePts = pts.map(p => p.join(',')).join(' ');
  const areaPts = [`0,${H}`, ...pts.map(p => p.join(',')), `${W},${H}`].join(' ');
  const gid = `pa-${id || Math.round(max)}`;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color || 'var(--accent)'} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color || 'var(--accent)'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${gid})`} />
      <polyline points={linePts} stroke={color || 'var(--accent)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type PDonutSegment = { value: number; color: string };

export type PDonutProps = {
  segments: PDonutSegment[];
  size?: number;
  label?: ReactNode;
  sub?: ReactNode;
  thickness?: number;
};

export function PDonut({ segments, size = 120, label, sub, thickness = 13 }: PDonutProps) {
  // Each segment is its own arc path (not overlapping dashed circles, which
  // left anti-aliasing slivers where the last segment met the first).
  // Values are normalised so rounded percentages never overrun the ring.
  const r = 36, cx = 50, cy = 50;
  const total = segments.reduce((t, s) => t + Math.max(0, s.value), 0) || 1;
  const live = segments.filter(s => s.value > 0);
  const gap = live.length > 1 ? 0.012 : 0; // fraction of the ring between segments
  const pt = (f: number): string => {
    const a = f * 2 * Math.PI - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(3)} ${(cy + r * Math.sin(a)).toFixed(3)}`;
  };
  const starts = live.map((_, i) => live.slice(0, i).reduce((t, s) => t + s.value / total, 0));
  const paths = live.map((s, i) => {
    const frac = s.value / total;
    const a0 = starts[i] + gap / 2, a1 = starts[i] + frac - gap / 2;
    if (frac >= 0.999) return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness} />;
    if (a1 <= a0) return null;
    const large = a1 - a0 > 0.5 ? 1 : 0;
    return <path key={i} d={`M ${pt(a0)} A ${r} ${r} 0 ${large} 1 ${pt(a1)}`} fill="none" stroke={s.color} strokeWidth={thickness} />;
  });
  // Shrink long labels so they stay inside the hole (text labels only; other nodes keep the base size).
  const hole = size * (2 * (r - thickness / 2)) / 100;
  const labelText = typeof label === 'string' || typeof label === 'number' ? String(label) : null;
  const labelSize = labelText ? Math.min(size * 0.15, (hole * 0.9) / (labelText.length * 0.6)) : size * 0.15;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">{paths}</svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {label && <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: labelSize, color: 'var(--text)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{label}</div>}
        {sub && <div style={{ fontFamily: 'var(--font-b)', fontSize: size * 0.075, color: 'var(--ter)' }}>{sub}</div>}
      </div>
    </div>
  );
}

export type PSectionProps = {
  title?: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
  /** Discreet "¿Cómo funciona?" entry point shown after the subtitle (null in demo mode). */
  help?: ReactNode;
};

export function PSection({ title, sub, action, style = {}, help }: PSectionProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, ...style }}>
      <div>
        {/* Page title: rendered as the page's single <h1> (same look as before). */}
        <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em', color: 'var(--text)' }}>{title}</h1>
        {(sub || help) && <p style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', marginTop: 4 }}>{sub}{help}</p>}
      </div>
      {action}
    </div>
  );
}

export type PScanLinkProps = {
  contract: string;
  style?: CSSProperties;
};

export function PScanLink({ contract, style = {} }: PScanLinkProps) {
  return (
    <a href={`https://polygonscan.com/address/${contract}`} target="_blank" rel="noopener noreferrer" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'var(--font-b)', fontSize: 12, color: '#8247E5', textDecoration: 'none',
      padding: '5px 12px', borderRadius: 999, background: 'rgba(130,71,229,0.10)', fontWeight: 600, ...style,
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#8247E5"><circle cx="12" cy="12" r="10"/></svg>
      {contract.slice(0, 6)}…{contract.slice(-4)}
      {Icons.ext}
    </a>
  );
}


export type PHelpProps = {
  /** Short explanation shown in the tooltip (plain text). */
  text: string;
  /** Accessible name of the trigger, e.g. "¿Qué es el TGE?". */
  label?: string;
  size?: number;
};

const HELP_EDGE = 8;
const HELP_GAP = 8;

/**
 * Small "?" help bubble. Opens on hover, keyboard focus or tap (mobile) and closes on
 * blur, Escape, a tap outside or a second tap. The text is linked with aria-describedby.
 * The bubble is portalled to <body> with fixed positioning, so cards with
 * overflow: hidden never clip it: it opens above the trigger (below when there is no
 * room) and is clamped to the viewport, following the trigger on scroll and resize.
 */
export function PHelp({ text, label = 'Más información', size = 15 }: PHelpProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  // Whether the bubble was already open when the current tap/click started: a tap focuses
  // (which opens) and then clicks, so the click must only close a bubble opened before.
  const openAtDown = useRef(false);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const btn = btnRef.current;
      const bubble = bubbleRef.current;
      if (!btn || !bubble) return;
      const r = btn.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const w = bubble.offsetWidth;
      const h = bubble.offsetHeight;
      const roomAbove = r.top - HELP_GAP - HELP_EDGE;
      const roomBelow = vh - r.bottom - HELP_GAP - HELP_EDGE;
      const above = roomAbove >= h || (roomBelow < h && roomAbove >= roomBelow);
      const top = above ? r.top - HELP_GAP - h : r.bottom + HELP_GAP;
      bubble.style.left = `${Math.max(HELP_EDGE, Math.min(r.left + r.width / 2 - w / 2, vw - HELP_EDGE - w))}px`;
      bubble.style.top = `${Math.max(HELP_EDGE, Math.min(top, vh - HELP_EDGE - h))}px`;
      bubble.style.visibility = 'visible';
    };
    place();
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !btnRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, text]);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}
      onPointerEnter={e => {
        if (e.pointerType === 'mouse') setOpen(true);
      }}
      onPointerLeave={e => {
        if (e.pointerType === 'mouse') setOpen(false);
      }}
    >
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onPointerDown={() => {
          openAtDown.current = open;
        }}
        onClick={e => {
          e.stopPropagation();
          if (openAtDown.current) {
            openAtDown.current = false;
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        style={{
          width: size, height: size, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface2)',
          color: 'var(--ter)', fontFamily: 'var(--font-b)', fontSize: size * 0.62, fontWeight: 700, lineHeight: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'help', padding: 0, marginLeft: 6,
        }}
      >
        ?
      </button>
      {open &&
        createPortal(
          <span
            ref={bubbleRef}
            id={id}
            role="tooltip"
            style={{
              // Placed by the layout effect before paint; hidden until then.
              position: 'fixed', left: 0, top: 0, visibility: 'hidden', zIndex: 10000,
              width: 'max-content', maxWidth: `min(260px, calc(100vw - ${HELP_EDGE * 2}px))`, padding: '9px 12px', borderRadius: 10, background: 'var(--text)', color: 'var(--bg)',
              fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 500, lineHeight: 1.45, textTransform: 'none', letterSpacing: 0,
              textAlign: 'left', boxShadow: 'var(--sh-lg)', pointerEvents: 'none', whiteSpace: 'normal',
            }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
