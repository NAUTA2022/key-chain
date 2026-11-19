import { useState, useEffect, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { fmtUSD } from '~/data';
import AchievementIcon from '~/components/social/AchievementIcon';
import { achievementsOf, type Achievement, type AchievementInput } from '~/lib/achievements';
import { useT } from '~/i18n/useT';
import { useDataText } from '~/i18n/data';

// "Nivel y logros" as a set of widget tiles (weather-app style): level
// staircase, invested-amount wave, reputation gauge, return scale,
// diversification compass and seniority timeline, then every achievement with its
// progress.

/** Everything the widgets show. `cats` = [category, value] pairs, largest first. */
export type LevelData = AchievementInput & {
  /** 1–5. */
  level: number;
  /** Return, %. Null: not available (shown empty, never invented). */
  ret: number | null;
  /** Reputation, 0–5. Null: not available. */
  rep: number | null;
  /** Sign-up month label ("Mar 2025"). */
  since: string;
};

// Level names are translated by id (social.level.names.<id>).
const LEVELS = [
  { n: 1, id: 'explorer', min: 0 },
  { n: 2, id: 'investor', min: 3000 },
  { n: 3, id: 'builder', min: 10000 },
  { n: 4, id: 'strategist', min: 25000 },
  { n: 5, id: 'visionary', min: 50000 },
] as const;
const fmtK = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`);
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

type TileProps = { icon: ReactNode; color: string; title: string; children: ReactNode; span?: number; style?: CSSProperties };

function Tile({ icon, color, title, children, span = 1, style }: TileProps) {
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} aria-label={title}
      style={{
        gridColumn: `span ${span}`, background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 22,
        padding: '16px 18px', position: 'relative', overflow: 'hidden', minHeight: 170, display: 'flex', flexDirection: 'column',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)', ...style,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative', zIndex: 2 }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
        <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{title}</span>
      </div>
      {children}
    </motion.section>
  );
}

type KnobProps = { color?: string; ring?: string; size?: number; style?: CSSProperties };

const Knob = ({ color = '#fff', ring, size = 18, style }: KnobProps) => (
  <div style={{
    position: 'absolute', width: size, height: size, borderRadius: '50%', transform: 'translate(-50%, -50%)',
    background: `radial-gradient(circle at 35% 30%, #fff 0%, ${color} 70%)`,
    boxShadow: `0 0 0 3px ${ring || 'rgba(255,255,255,0.85)'}, 0 2px 10px rgba(0,0,0,0.18)`, zIndex: 3, ...style,
  }} />
);

// ─── Icons (line, 16px) ───────────────────────────────────────────────────────
const I = {
  level: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>,
  wave: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M2 8c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/><path d="M2 14c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/></svg>,
  gauge: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 12l4-3"/></svg>,
  ret: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  compass: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 18a7 7 0 0114 0"/><path d="M2 18h20M12 4v3M4.2 9.2l2 1.6M19.8 9.2l-2 1.6"/></svg>,
  trophy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z"/><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/></svg>,
};

const levelAt = (level: number) => LEVELS[Math.min(Math.max(level, 1), 5) - 1];

// ─── Level progress (staircase) ───────────────────────────────────────────────
// One step per level, each higher than the last. Reached steps are filled,
// the next one fills with the progress towards it; the current one glows.
// `hideProgress`: someone else's private amounts (only their level is public).
function LevelStairs({ d, hideProgress }: { d: LevelData; hideProgress?: boolean }) {
  const { t } = useT('profile');
  const idx = d.level - 1;
  const next = LEVELS[Math.min(idx + 1, 4)];
  const frac = hideProgress ? 0 : d.level >= 5 ? 1 : clamp((d.invested - levelAt(d.level).min) / (next.min - levelAt(d.level).min));
  const STEP_H = [22, 38, 54, 70, 86];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4, alignItems: 'end', marginTop: 'auto' }}>
      {LEVELS.map((l, i) => {
        const reached = i <= idx, isNext = i === idx + 1, on = i === idx;
        return (
          <div key={l.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{
              height: STEP_H[i], borderRadius: '10px 10px 4px 4px', position: 'relative', overflow: 'hidden',
              background: reached ? 'linear-gradient(180deg, #8b5cf6, #3b82f6)' : 'var(--surface2)',
              boxShadow: on ? '0 6px 18px rgba(99,102,241,0.35)' : 'none',
              border: reached ? 'none' : '1px dashed var(--border)',
            }}>
              {isNext && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${frac * 100}%`, background: 'linear-gradient(180deg, rgba(139,92,246,0.45), rgba(59,130,246,0.45))' }} />
              )}
              {isNext && !hideProgress && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-b)', fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{Math.round(frac * 100)}%</span>
              )}
            </div>
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-b)', marginTop: 8 }}>
              <div style={{ fontSize: 11.5, color: on ? 'var(--text)' : 'var(--ter)', fontWeight: 700 }}>N{l.n}</div>
              <div style={{ fontSize: 11, color: on ? 'var(--text)' : 'var(--ter)', fontWeight: on ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t(`social.level.names.${l.id}`)}</div>
              <div style={{ fontSize: 13, color: reached ? 'var(--text)' : 'var(--sec)', fontWeight: on ? 800 : 600, marginTop: 2 }}>{fmtK(l.min)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Invested amount (humidity-style wave) ────────────────────────────────────
// The water keeps level like a real liquid: on phones it follows the
// gyroscope (left-right tilt rotates the surface the other way, front-back
// tilt sloshes the level a little); with a mouse it tilts towards the
// pointer. iOS only exposes the gyroscope after a tap, so the tile asks once.
type OrientationPermissionApi = { requestPermission?: () => Promise<'granted' | 'denied'> };
const orientationApi = (): OrientationPermissionApi | null =>
  (typeof DeviceOrientationEvent === 'undefined' ? null : (DeviceOrientationEvent as unknown as OrientationPermissionApi));

function useLiquidTilt() {
  const angle = useSpring(0, { stiffness: 60, damping: 9, mass: 0.8 });
  const slosh = useSpring(0, { stiffness: 50, damping: 8 });
  const [needsTap, setNeedsTap] = useState(() => typeof orientationApi()?.requestPermission === 'function');
  useEffect(() => {
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null) return;
      angle.set(-clamp(e.gamma, -28, 28));
      slosh.set(clamp(((e.beta ?? 45) - 45) / 4, -8, 8));
    };
    window.addEventListener('deviceorientation', onTilt);
    return () => window.removeEventListener('deviceorientation', onTilt);
  }, [angle, slosh]);
  const enable = async () => {
    if (!needsTap) return;
    try { await orientationApi()?.requestPermission?.(); } catch { /* denied: stays still */ }
    setNeedsTap(false);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    angle.set(((e.clientX - r.left) / r.width - 0.5) * -16);
  };
  const onPointerLeave = () => angle.set(0);
  return { angle, slosh, needsTap, enable, onPointerMove, onPointerLeave };
}

function WaveFill({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  const { t } = useT('profile');
  const h = 22 + pct * 0.5; // % of tile filled
  const wave = 'M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 V 40 H 0 Z';
  const tilt = useLiquidTilt();
  const level = useTransform(tilt.slosh, v => `${h + v}%`);
  return (
    <>
      <div onClick={() => void tilt.enable()} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave} aria-hidden="true"
        style={{ position: 'absolute', inset: 0, zIndex: 1, cursor: tilt.needsTap ? 'pointer' : 'default' }}>
        {/* Wider than the tile so the corners stay full while it rotates */}
        <motion.div style={{ position: 'absolute', left: '-100%', right: '-100%', bottom: '-30%', height: level, rotate: tilt.angle, transformOrigin: '50% 100%', paddingBottom: '30%', boxSizing: 'content-box' }}>
          <motion.svg viewBox="0 0 200 40" preserveAspectRatio="none" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute', top: -16, left: 0, width: '200%', height: 22 }}>
            <path d={wave} fill="#14c8b4" />
          </motion.svg>
          <div style={{ position: 'absolute', inset: 0, top: 4, background: 'linear-gradient(180deg, #14c8b4, #0fb3a1)' }} />
        </motion.div>
      </div>
      <div style={{ marginTop: 'auto', position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 26, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 1px 2px rgba(0,0,0,0.12)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>{sub}</div>
        {tilt.needsTap && <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{t('social.level.tapToMove')}</div>}
      </div>
    </>
  );
}

// ─── Reputation (pressure-style gauge) ────────────────────────────────────────
function Gauge({ value: shown, max = 5 }: { value: number | null; max?: number }) {
  const { t } = useT('profile');
  const value = shown ?? 0;
  const a0 = 150, sweep = 240;
  const r = 40, cx = 50, cy = 50;
  const pt = (deg: number): [number, number] => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const arc = (from: number, to: number) => {
    const [x1, y1] = pt(from), [x2, y2] = pt(to);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const end = a0 + sweep * clamp(value / max);
  const [kx, ky] = pt(end);
  return (
    <div style={{ position: 'relative', width: 130, height: 112, margin: '-2px auto 0' }}>
      <svg viewBox="0 0 100 86" style={{ width: '100%', height: '100%', overflow: 'visible' }} aria-hidden="true">
        <defs>
          <linearGradient id="g-rep" x1="0" x2="1"><stop offset="0" stopColor="#fda4af" /><stop offset="1" stopColor="#e11d48" /></linearGradient>
        </defs>
        <path d={arc(a0, a0 + sweep)} fill="none" stroke="var(--surface2)" strokeWidth="9" strokeLinecap="round" />
        {shown !== null && <path d={arc(a0, end)} fill="none" stroke="url(#g-rep)" strokeWidth="9" strokeLinecap="round" />}
      </svg>
      {shown !== null && <Knob color="#fb7185" size={16} style={{ left: `${kx}%`, top: `${(ky / 86) * 100}%` }} />}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '38%', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 24, color: 'var(--text)', lineHeight: 1 }}>{shown === null ? '—' : value.toFixed(1)}</div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 3 }}>{shown === null ? t('social.level.noData') : t('social.level.outOf5')}</div>
      </div>
    </div>
  );
}

// ─── Return (UV-index-style scale) ────────────────────────────────────────────
function ReturnScale({ ret }: { ret: number | null }) {
  const { t } = useT('profile');
  const pos = clamp(((ret ?? 0) + 10) / 40); // -10% … +30%
  const label = ret === null ? t('social.level.noData') : ret >= 15 ? t('social.level.retExcellent') : ret >= 8 ? t('social.level.retVeryGood') : ret >= 0 ? t('social.level.retPositive') : t('social.level.retNegative');
  return (
    <>
      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 26, color: 'var(--text)', letterSpacing: '-0.02em' }}>{ret === null ? '—' : `${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%`}</div>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>{label}</div>
      <div style={{ position: 'relative', marginTop: 'auto', height: 8, borderRadius: 99, background: 'linear-gradient(90deg, #ef4444, #f59e0b 30%, #eab308 45%, #22c55e 70%, #10b981)' }}>
        {ret !== null && <Knob color="#fde68a" size={16} style={{ left: `${pos * 100}%`, top: '50%' }} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)' }}>
        <span>-10%</span><span>+30%</span>
      </div>
    </>
  );
}

// ─── Diversification (wind-style compass) ─────────────────────────────────────
function Compass({ cats }: { cats: LevelData['cats'] }) {
  const { t } = useT('profile');
  const { t: tc } = useT('common');
  const total = cats.reduce((s, [, v]) => s + v, 0) || 1;
  const top = cats.slice(0, 4);
  const dirs = [-90, 0, 90, 180];
  const lead = top[0];
  const needle = dirs[0];
  return (
    <>
      <div style={{ position: 'relative', width: 124, height: 124, margin: '-6px auto 0' }}>
        <svg viewBox="-8 -8 116 116" style={{ width: '100%', height: '100%', overflow: 'visible' }} aria-hidden="true">
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180, long = i % 9 === 0;
            return <line key={i} x1={50 + Math.cos(a) * (long ? 30 : 33)} y1={50 + Math.sin(a) * (long ? 30 : 33)} x2={50 + Math.cos(a) * 37} y2={50 + Math.sin(a) * 37} stroke="var(--border)" strokeWidth={long ? 1.6 : 1} />;
          })}
          {top.map(([c], i) => {
            const a = (dirs[i] * Math.PI) / 180;
            return <text key={c} x={50 + Math.cos(a) * 48} y={50 + Math.sin(a) * 48 + 3} textAnchor="middle" style={{ fontFamily: 'var(--font-b)', fontSize: 8.5, fontWeight: 700, fill: i === 0 ? '#6366f1' : 'var(--sec)' }}>{tc(`categories.${c}`).slice(0, 3).toUpperCase()}</text>;
          })}
          <g transform={`rotate(${needle + 90} 50 50)`}>
            <line x1="50" y1="64" x2="50" y2="26" stroke="#6366f1" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M50 18 L45 27 L55 27 Z" fill="#6366f1" />
            <circle cx="50" cy="66" r="4" fill="#6366f1" />
          </g>
          <circle cx="50" cy="50" r="2.4" fill="var(--surface)" stroke="#6366f1" strokeWidth="1.2" />
        </svg>
      </div>
      <div style={{ marginTop: 'auto', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
        {t(cats.length === 1 ? 'social.level.categoriesOne' : 'social.level.categoriesOther', { count: cats.length })}{lead ? <span style={{ fontWeight: 500, color: 'var(--ter)', fontSize: 13 }}> · {tc(`categories.${lead[0]}`)} {Math.round((lead[1] / total) * 100)}%</span> : null}
      </div>
    </>
  );
}

// ─── Seniority (timeline) ─────────────────────────────────────────────────────
// From the sign-up date through the seniority badges (6 months, 1, 2 and 3
// years); the line fills up to today.
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const addMonths = (label: string, n: number) => {
  const [m, y] = String(label).split(' ');
  const i = MONTHS_ES.indexOf(m);
  if (i < 0 || !y) return '';
  const t = Number(y) * 12 + i + n;
  return `${MONTHS_ES[t % 12]} ${Math.floor(t / 12)}`;
};
// Labels by id (social.level.stops.<id>).
const STOPS = [
  { m: 0, id: 'signup' },
  { m: 6, id: 'm6' },
  { m: 12, id: 'y1' },
  { m: 24, id: 'y2' },
  { m: 36, id: 'y3' },
] as const;

function SeniorityTimeline({ months, since }: { months: number; since: string }) {
  const { t, raw } = useT('profile');
  // "Mar 2025" labels come in Spanish; show the month in the active language.
  const monthNames = raw<string[]>('social.months');
  const localMonth = (label: string) => {
    const [m, y] = label.split(' ');
    const i = MONTHS_ES.indexOf(m);
    return i < 0 || !y ? label : `${monthNames[i] ?? m} ${y}`;
  };
  const stops = STOPS;
  // Evenly spaced stops; today is placed between the two around it.
  const pos = (mm: number) => {
    for (let i = 0; i < stops.length - 1; i++) {
      if (mm <= stops[i + 1].m) return (i + (mm - stops[i].m) / (stops[i + 1].m - stops[i].m)) / (stops.length - 1);
    }
    return 1;
  };
  const now = pos(months);
  const nextStop = stops.find(st => st.m > months);
  return (
    <div style={{ marginTop: 'auto' }}>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', marginBottom: 18 }}>
        <b style={{ color: 'var(--text)', fontSize: 22, fontFamily: 'var(--font-h)' }}>{months}</b> {t(months === 1 ? 'social.level.monthsInBrikmeOne' : 'social.level.monthsInBrikmeOther')}
        {nextStop && <span style={{ color: 'var(--ter)' }}>{t(nextStop.m - months === 1 ? 'social.level.nextBadgeOne' : 'social.level.nextBadgeOther', { badge: t(`social.level.stops.${nextStop.id}`), count: nextStop.m - months })}</span>}
      </div>
      <div style={{ position: 'relative', height: 26, margin: '0 22px' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 11, height: 4, borderRadius: 99, background: 'var(--surface2)' }} />
        <motion.div initial={{ width: 0 }} animate={{ width: `${now * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ position: 'absolute', left: 0, top: 11, height: 4, borderRadius: 99, background: 'linear-gradient(90deg, #f59e0b, #f97316)' }} />
        {stops.map((st, i) => {
          const done = months >= st.m;
          return (
            <div key={st.m} style={{
              position: 'absolute', left: `${(i / (stops.length - 1)) * 100}%`, top: 13, transform: 'translate(-50%, -50%)',
              width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'var(--surface)', border: done ? 'none' : '2px solid var(--border)',
              color: '#fff', fontSize: 10, fontWeight: 800, zIndex: 2,
            }}>{done ? '✓' : ''}</div>
          );
        })}
        <Knob color="#fbbf24" size={16} style={{ left: `${now * 100}%`, top: 13 }} />
      </div>
      <div style={{ position: 'relative', height: 34, margin: '8px 22px 0' }}>
        {stops.map((st, i) => {
          const done = months >= st.m;
          return (
            <div key={st.m} style={{ position: 'absolute', left: `${(i / (stops.length - 1)) * 100}%`, transform: 'translateX(-50%)', textAlign: 'center', fontFamily: 'var(--font-b)', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: done ? 'var(--text)' : 'var(--ter)' }}>{t(`social.level.stops.${st.id}`)}</div>
              <div style={{ fontSize: 11, color: 'var(--ter)' }}>{localMonth(i === 0 ? since : addMonths(since, st.m))}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Achievements ─────────────────────────────────────────────────────────────
function AchievementTile({ a }: { a: Achievement }) {
  const { t } = useT('profile');
  const done = a.p >= 1;
  return (
    <div style={{
      background: done ? 'linear-gradient(160deg, color-mix(in oklab, #8247E5 10%, var(--surface)), var(--surface))' : 'var(--surface)',
      border: `1px solid ${done ? 'color-mix(in oklab, #8247E5 35%, var(--border-l))' : 'var(--border-l)'}`,
      borderRadius: 20, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'rgba(130,71,229,0.12)' : 'var(--surface2)', color: done ? '#8247E5' : 'var(--ter)' }}><AchievementIcon name={done ? a.icon : 'lock'} /></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{a.label}</div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{a.desc}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--surface2)' }} role="progressbar" aria-label={a.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(a.p * 100)}>
          <div style={{ width: `${a.p * 100}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #8247E5, #3b82f6)' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 700, color: done ? 'var(--pos)' : 'var(--sec)', minWidth: 72, textAlign: 'right' }}>
          {done ? t('social.level.achieved') : `${Math.round(a.p * 100)}%`}
        </span>
      </div>
    </div>
  );
}

type LevelWidgetsProps = {
  d: LevelData;
  isMobile: boolean;
  /** Achievements from the API (live); omitted = computed from `d` (demo); null = private. */
  achievements?: readonly Achievement[] | null;
  /** Someone else's profile in live mode: only their level is public (no amounts, no achievements). */
  privateStats?: boolean;
};

export default function LevelWidgets({ d, isMobile, achievements: given, privateStats }: LevelWidgetsProps) {
  const { t } = useT('profile');
  const dataText = useDataText();
  const levelTitle = t('social.level.title', { level: d.level, name: t(`social.level.names.${levelAt(d.level).id}`) });
  const next = LEVELS[Math.min(d.level, 4)];
  const toNext = Math.max(0, next.min - d.invested);
  const pctNext = d.level >= 5 ? 100 : clamp(d.invested / next.min) * 100;
  const achievements = given === undefined ? achievementsOf(d).map(dataText.achievement) : given;
  const doneCount = achievements?.filter(a => a.p >= 1).length ?? 0;
  const cols = isMobile ? 2 : 4;
  if (privateStats) {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 14 }}>
          <Tile icon={I.level} color="#8247E5" title={levelTitle} span={cols}>
            <LevelStairs d={d} hideProgress />
          </Tile>
        </div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', marginTop: 18 }}>
          {t('social.level.privateNote')}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 14 }}>
        <Tile icon={I.level} color="#8247E5" title={levelTitle} span={2}>
          <LevelStairs d={d} />
        </Tile>
        <Tile icon={I.wave} color="#14b8a6" title={t('social.level.invested')}>
          <WaveFill pct={pctNext} label={fmtUSD(d.invested)} sub={d.level >= 5 ? t('social.level.maxLevel') : t('social.level.toNext', { amount: fmtUSD(toNext), level: d.level + 1 })} />
        </Tile>
        <Tile icon={I.gauge} color="#e11d48" title={t('social.level.reputation')}>
          <Gauge value={d.rep} />
        </Tile>
        <Tile icon={I.ret} color="#d946ef" title={t('social.level.return')}>
          <ReturnScale ret={d.ret} />
        </Tile>
        <Tile icon={I.compass} color="#6366f1" title={t('social.level.diversification')}>
          <Compass cats={d.cats} />
        </Tile>
        <Tile icon={I.sun} color="#f59e0b" title={t('social.level.seniority')} span={2}>
          <SeniorityTimeline months={d.months} since={d.since} />
        </Tile>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '26px 0 12px' }}>
        <span style={{ color: '#f59e0b', display: 'flex' }}>{I.trophy}</span>
        <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{t('social.level.achievements')}</span>
        {achievements && <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{t('social.level.unlocked', { done: doneCount, total: achievements.length })}</span>}
      </div>
      {achievements ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {achievements.map(a => <AchievementTile key={a.label} a={a} />)}
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>{t('social.level.loadError')}</div>
      )}
    </div>
  );
}
