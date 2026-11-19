import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, AnimatePresence, motion, useMotionTemplate, useMotionValue, useReducedMotion } from 'framer-motion';
import type { DemoRunStatus, Progress, WalletState } from './api';

/**
 * The demo flow as a living map that follows the money. Money enters on the left, 5 wallets buy
 * the project's tokens, the company (top right) feeds the project, the project pays the wallets
 * back and the wallets send everything down to the user's account. A camera frames whatever is
 * happening now; each of the 5 steps is marked on the map itself.
 */

type Pt = { x: number; y: number };
export type StepKey = 1 | 2 | 3 | 4 | 5;
type Layout = { w: number; h: number; source: Pt; account: Pt; company: Pt; project: Pt; wallets: Pt[]; payoutBend: number; sweepBend: number; markers: Record<StepKey, Pt> };

// Desktop (wide): money enters left → wallets → project; the company feeds it from the top right, the account collects bottom right.
const DESKTOP: Layout = {
  w: 1400, h: 660,
  source: { x: 170, y: 330 }, project: { x: 990, y: 330 }, company: { x: 1240, y: 100 }, account: { x: 1240, y: 560 },
  wallets: [130, 230, 330, 430, 530].map(y => ({ x: 560, y })), payoutBend: -0.18, sweepBend: 0.22,
  markers: { 1: { x: 365, y: 248 }, 2: { x: 790, y: 268 }, 3: { x: 1135, y: 206 }, 4: { x: 790, y: 392 }, 5: { x: 870, y: 528 } },
};
// Phone: source and account on top, wallets in a row, project and company below.
const MOBILE: Layout = {
  w: 600, h: 1000,
  source: { x: 150, y: 80 }, account: { x: 450, y: 80 }, project: { x: 300, y: 640 }, company: { x: 300, y: 900 },
  wallets: [62, 181, 300, 419, 538].map(x => ({ x, y: 330 })), payoutBend: 0.18, sweepBend: 0.08,
  markers: { 1: { x: 190, y: 210 }, 2: { x: 170, y: 470 }, 3: { x: 300, y: 790 }, 4: { x: 430, y: 470 }, 5: { x: 410, y: 210 } },
};

/** How the money enters, as drawn in the source node (`accent` marks the method). */
export type FlowSource = { title: string; sub: string; accent?: string };

type NodeKey = 'source' | 'wallets' | 'project' | 'company' | 'account';
const STEP_LABEL: Record<StepKey, string> = { 1: 'Recarga', 2: 'Inversión', 3: 'Ganancia', 4: 'Reparto', 5: 'Tu cuenta' };
/** What each step involves: framed by the camera and kept bright while the rest dims. */
const STEP_NODES: Record<StepKey, readonly NodeKey[]> = {
  1: ['source', 'wallets'], 2: ['wallets', 'project'], 3: ['company', 'project'], 4: ['project', 'wallets'], 5: ['wallets', 'account'],
};

const EASE = [0.16, 1, 0.3, 1] as const;

/** A gentle curve from a to b (bent sideways by `bend` × length). */
function curve(a: Pt, b: Pt, bend = 0.12): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${(mx - dy * bend).toFixed(1)},${(my + dx * bend).toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
}

type Frame = { x: number; y: number; w: number; h: number };
/** Smallest frame (same aspect as the map, at most 1.7× zoom) around `pts` plus padding. */
function frameAround(l: Layout, pts: readonly Pt[], pad: number): Frame {
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const x0 = Math.min(...xs) - pad;
  const x1 = Math.max(...xs) + pad;
  const y0 = Math.min(...ys) - pad;
  const y1 = Math.max(...ys) + pad;
  const ratio = l.w / l.h;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let w = Math.max(x1 - x0, (y1 - y0) * ratio, l.w / 1.7);
  let h = w / ratio;
  if (w > l.w) { w = l.w; h = l.h; }
  return { x: Math.min(Math.max(cx - w / 2, 0), l.w - w), y: Math.min(Math.max(cy - h / 2, 0), l.h - h), w, h };
}

type EdgeState = 'idle' | 'live' | 'done';
type Tone = 'out' | 'in';
const TONE: Record<Tone, string> = { out: 'var(--text)', in: 'var(--pos)' };

function Edge({ d, state, tone, still }: { d: string; state: EdgeState; tone: Tone; still: boolean }) {
  if (state === 'idle') return null;
  const color = TONE[tone];
  return (
    <g>
      <path d={d} fill="none" strokeLinecap="round" style={{ stroke: color, strokeWidth: state === 'live' ? 2.2 : 1.4, opacity: state === 'done' ? 0.28 : 0.9, transition: 'opacity .6s' }} />
      {state === 'live' && !still && [0, 0.5, 1].map(begin => (
        <g key={begin} opacity={0}>
          <circle r={9} style={{ fill: color, opacity: 0.18 }} />
          <circle r={4.5} style={{ fill: color }} />
          <animateMotion dur="1.5s" begin={`${begin}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.2 1" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.85;1" dur="1.5s" begin={`${begin}s`} repeatCount="indefinite" />
        </g>
      ))}
    </g>
  );
}

/** Structural route, always visible: the map reads even before anything moves. */
function Route({ d }: { d: string }) {
  return <path d={d} fill="none" style={{ stroke: 'var(--border)', strokeWidth: 1.2, strokeDasharray: '2 6', strokeLinecap: 'round' }} />;
}

function Card({ at, w, h, caption, title, sub, accent, active }: { at: Pt; w: number; h: number; caption: string; title: string; sub: string; accent?: string; active: boolean }) {
  return (
    <g transform={`translate(${at.x - w / 2},${at.y - h / 2})`}>
      <rect width={w} height={h} rx={18} filter="url(#df-shadow)" style={{ fill: 'var(--bg)' }} />
      <rect width={w} height={h} rx={18} style={{ fill: 'var(--surface)', stroke: active ? 'var(--text)' : 'var(--border)', strokeWidth: active ? 1.8 : 1, transition: 'stroke .4s' }} />
      <g transform="translate(20,30)">
        {accent && <circle cx={4} cy={-4} r={4} style={{ fill: accent }} />}
        <text x={accent ? 14 : 0} y={0} style={{ fill: 'var(--ter)', font: '700 12px var(--font-b)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{caption}</text>
      </g>
      <text x={20} y={h - 38} style={{ fill: 'var(--text)', font: '800 23px var(--font-h)', letterSpacing: '-0.02em' }}>{title}</text>
      <text x={20} y={h - 15} style={{ fill: 'var(--sec)', font: '500 15.5px var(--font-b)' }}>{sub}</text>
    </g>
  );
}

const WALLET_LABEL: Record<WalletState, string> = { idle: 'Vacía', funded: '1 USD', holding: '1 parte', paid: '+1 USD', swept: 'Enviado' };

function WalletNode({ at, index, state, address, mine }: { at: Pt; index: number; state: WalletState; address: string | undefined; mine: boolean }) {
  const lit = state !== 'idle';
  const paid = state === 'paid' || state === 'swept';
  const ring = paid ? 'var(--pos)' : lit ? 'var(--text)' : 'var(--border)';
  return (
    <g transform={`translate(${at.x},${at.y})`}>
      {address && <title>{`Wallet ${index + 1}: ${address}`}</title>}
      <circle r={42} filter="url(#df-shadow)" style={{ fill: 'var(--bg)' }} />
      <circle r={42} style={{ fill: 'var(--surface)', stroke: ring, strokeWidth: lit ? 2 : 1, transition: 'stroke .4s' }} />
      {/* Wallet glyph */}
      <g transform="translate(-9,-33)" style={{ fill: 'none', stroke: lit ? 'var(--text)' : 'var(--ter)', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
        <path d="M2 5.5h13a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1v-9zm0 0V4a1.5 1.5 0 011.5-1.5H13v3" />
        <circle cx={12.5} cy={10.5} r={1} style={{ fill: lit ? 'var(--text)' : 'var(--ter)', stroke: 'none' }} />
      </g>
      <text y={4} textAnchor="middle" style={{ fill: 'var(--text)', font: '800 18px var(--font-h)' }}>{`W${index + 1}`}</text>
      {/* What the wallet holds now: dollars (coin) or a part of the villa (token). */}
      {state !== 'idle' && (
        <g transform="translate(-34,26)">
          <circle r={13} style={{ fill: state === 'holding' ? 'var(--text)' : 'var(--pos)', stroke: 'var(--bg)', strokeWidth: 2.5 }} />
          {state === 'holding'
            ? <path d="M0 -6.5L5.6 -3.25V3.25L0 6.5L-5.6 3.25V-3.25Z" style={{ fill: 'none', stroke: 'var(--bg)', strokeWidth: 1.8, strokeLinejoin: 'round' }} />
            : state === 'swept'
              ? <path d="M-4.5 0.5l3 3 6-6.5" style={{ fill: 'none', stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
              : <text y={4.5} textAnchor="middle" style={{ fill: '#fff', font: '800 13px var(--font-h)' }}>$</text>}
        </g>
      )}
      <text y={22} textAnchor="middle" style={{ fill: paid ? 'var(--pos)' : lit ? 'var(--text)' : 'var(--ter)', font: '600 13px var(--font-b)', transition: 'fill .3s' }}>{WALLET_LABEL[state]}</text>
      {/* Whose part this is: yours (bought with your money) or another investor's. */}
      <g transform="translate(54,0)">
        <rect y={-12} width={mine ? 52 : 70} height={24} rx={12} style={{ fill: mine ? 'var(--text)' : 'var(--surface2)', stroke: mine ? 'none' : 'var(--border)' }} />
        <text x={mine ? 26 : 35} y={4.5} textAnchor="middle" style={{ fill: mine ? 'var(--surface)' : 'var(--sec)', font: '700 11.5px var(--font-b)' }}>{mine ? 'Tuya' : 'Otro inv.'}</text>
      </g>
    </g>
  );
}

type MarkerState = 'pending' | 'current' | 'done';

/** A step, written on the map: number, name and what moves in it. */
function Marker({ at, step, detail, state }: { at: Pt; step: StepKey; detail: string; state: MarkerState }) {
  // Only the current step spells out what moves; the rest stay short so the map stays clean.
  const text = state === 'current' ? `${STEP_LABEL[step]} · ${detail}` : STEP_LABEL[step];
  const w = text.length * 8.7 + 56;
  const current = state === 'current';
  const done = state === 'done';
  return (
    <g transform={`translate(${at.x - w / 2},${at.y - 18})`}>
      {current && <rect x={-5} y={-5} width={w + 10} height={46} rx={23} className="df-marker-halo" style={{ fill: 'none', stroke: 'var(--text)', strokeWidth: 1 }} />}
      <rect width={w} height={36} rx={18} style={{ fill: 'var(--bg)' }} />
      <rect width={w} height={36} rx={18} style={{ fill: current ? 'var(--text)' : 'var(--surface)', stroke: done ? 'var(--pos)' : current ? 'var(--text)' : 'var(--border)', strokeWidth: 1.2 }} />
      <circle cx={18} cy={18} r={12.5} style={{ fill: done ? 'var(--pos)' : current ? 'var(--surface)' : 'var(--surface2)' }} />
      {done
        ? <path d="M12.5 18.2l3.6 3.6 7.2-7.4" fill="none" style={{ stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
        : <text x={18} y={23} textAnchor="middle" style={{ fill: current ? 'var(--text)' : 'var(--sec)', font: '800 14px var(--font-h)' }}>{step}</text>}
      <text x={38} y={23.5} style={{ fill: current ? 'var(--surface)' : done ? 'var(--pos)' : 'var(--sec)', font: '700 15px var(--font-b)', fontVariantNumeric: 'tabular-nums' }}>{text}</text>
    </g>
  );
}

type Props = {
  mobile: boolean; status: DemoRunStatus | null; p: Progress; wallets: readonly string[]; image: string; simulated: boolean; source: FlowSource; payoutUsdt: number;
  /** The guide decides what the camera shows: a step, or 'all' for the whole map. Omitted = follow the run. */
  focus?: StepKey | 'all';
  /** Extra controls in the camera bar (guide navigation, voice). */
  controls?: ReactNode;
  /** Parts bought by the user: W1..W{mine} are theirs (funded by their money, profit swept to them). */
  mine: number;
  /** Fill the parent's height (single-view page) instead of keeping the map's aspect ratio. */
  fill?: boolean;
  /** Small card for the current step, in the corner the step leaves free. */
  anchor?: ReactNode;
};

export default function FlowDiagram({ mobile, status, p, wallets, image, simulated, source, payoutUsdt, focus, controls, mine, fill, anchor }: Props) {
  const still = useReducedMotion() ?? false;
  const [follow, setFollow] = useState(true);
  const l = mobile ? MOBILE : DESKTOP;
  const ws = l.wallets;
  const paying = status === 'awaiting_payment';
  const investing = status === 'investing';
  const distributing = status === 'distributing';
  const done = status === 'completed';
  const picked = Boolean(source.accent);

  const fund = (i: number): EdgeState => (p.step(`fund:${i}`) ? (p.invested === 5 ? 'done' : 'live') : investing && i === p.funded ? 'live' : 'idle');
  const invest = (i: number): EdgeState => (p.step(`invest:${i}`) ? 'done' : investing && p.funded === 5 ? 'live' : 'idle');
  const claim = (i: number): EdgeState => (p.step(`claim:${i}`) ? 'done' : distributing && p.deposit ? 'live' : 'idle');
  const sweep = (i: number): EdgeState => (p.step(`sweep:${i}`) ? (done ? 'done' : 'live') : distributing && p.step(`claim:${i}`) ? 'live' : 'idle');
  const deposit: EdgeState = p.deposit ? 'done' : distributing ? 'live' : 'idle';
  const payout: EdgeState = p.payout ? 'done' : p.swept === 5 && !simulated ? 'live' : 'idle';

  // The step happening now (null = overview: nothing chosen yet, finished, failed or expired).
  const auto: StepKey | null =
    paying || (!status && picked) ? 1
    : investing ? (p.funded < 5 ? 1 : 2)
    : status === 'invested' ? 3
    : distributing ? (!p.deposit ? 3 : p.claimed < 5 ? 4 : 5)
    : null;
  const step: StepKey | null = focus === undefined ? auto : focus === 'all' ? null : focus;
  const doneUpTo = done ? 5 : status === 'invested' ? 2 : distributing ? (p.deposit ? (p.claimed === 5 ? 4 : 3) : 2) : investing && p.funded === 5 ? 1 : 0;
  const markerState = (s: StepKey): MarkerState => (s === step ? 'current' : s <= doneUpTo ? 'done' : 'pending');

  const nodeAt: Record<NodeKey, Pt[]> = { source: [l.source], wallets: ws, project: [l.project], company: [l.company], account: [l.account] };
  const target: Frame = follow && step
    ? frameAround(l, STEP_NODES[step].flatMap(n => nodeAt[n]), mobile ? 110 : 135)
    : { x: 0, y: 0, w: l.w, h: l.h };
  const lit = (n: NodeKey) => !step || STEP_NODES[step].includes(n);

  // Camera: the viewBox glides to the frame of the current step.
  const vx = useMotionValue(target.x);
  const vy = useMotionValue(target.y);
  const vw = useMotionValue(target.w);
  const vh = useMotionValue(target.h);
  const viewBox = useMotionTemplate`${vx} ${vy} ${vw} ${vh}`;
  // The user can take the camera (drag to move, wheel or +/− to zoom); it stays theirs until they
  // retake the guided shot or the guide moves to another step (a new target).
  const targetKey = `${target.x}|${target.y}|${target.w}|${target.h}`;
  const [manualKey, setManualKey] = useState<string | null>(null);
  const manual = manualKey === targetKey;
  const keyRef = useRef(targetKey);
  useEffect(() => { keyRef.current = targetKey; }, [targetKey]);
  useEffect(() => {
    if (manual) return;
    const opts = { duration: still ? 0 : 1.1, ease: EASE };
    const anims = [animate(vx, target.x, opts), animate(vy, target.y, opts), animate(vw, target.w, opts), animate(vh, target.h, opts)];
    return () => anims.forEach(a => a.stop());
  }, [target.x, target.y, target.w, target.h, still, vx, vy, vw, vh, manual]);

  const svgRef = useRef<SVGSVGElement>(null);
  const takeOver = () => { [vx, vy, vw, vh].forEach(v => v.stop()); setManualKey(keyRef.current); };
  /** Zooms by `f` keeping the map point under (cx, cy) (client coords; centre when omitted) in place. */
  const zoomAt = (f: number, cx?: number, cy?: number) => {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = vw.get(), h = vh.get();
    const k = Math.min(r.width / w, r.height / h);
    const px = vx.get() + ((cx ?? r.left + r.width / 2) - r.left - (r.width - w * k) / 2) / k;
    const py = vy.get() + ((cy ?? r.top + r.height / 2) - r.top - (r.height - h * k) / 2) / k;
    const nw = Math.min(Math.max(w * f, l.w / 5), l.w * 1.5);
    const sc = nw / w;
    takeOver();
    vx.set(px - (px - vx.get()) * sc); vy.set(py - (py - vy.get()) * sc); vw.set(nw); vh.set(h * sc);
  };
  const zoomRef = useRef(zoomAt);
  useEffect(() => { zoomRef.current = zoomAt; });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    // Non-passive: the wheel zooms the map instead of scrolling the page.
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomRef.current(Math.exp(e.deltaY * 0.0015), e.clientX, e.clientY); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const pan = {
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      drag.current = { x: e.clientX, y: e.clientY, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => {
      const d = drag.current;
      const el = svgRef.current;
      if (!d || !el) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return;
      if (!d.moved) { d.moved = true; takeOver(); }
      const r = el.getBoundingClientRect();
      const k = Math.min(r.width / vw.get(), r.height / vh.get());
      vx.set(vx.get() - (e.clientX - d.x) / k);
      vy.set(vy.get() - (e.clientY - d.y) / k);
      d.x = e.clientX; d.y = e.clientY;
    },
    onPointerUp: () => { drag.current = null; },
  };

  const R = 90;
  const dim = (n: NodeKey) => ({ opacity: lit(n) ? 1 : 0.32, transition: 'opacity .6s' });
  const markers: Array<{ step: StepKey; detail: string }> = [
    { step: 1, detail: `${mine} USD tuyos` }, { step: 2, detail: '1 parte c/u' }, { step: 3, detail: '+5 USD' }, { step: 4, detail: '1 USD por parte' }, { step: 5, detail: `${p.swept}/${mine} USD` },
  ];

  // The step's card sits in the corner away from what that step shows (the camera frames it).
  const corner: 'left' | 'right' = step === 1 ? 'right' : 'left';

  return (
    <div style={fill ? { height: '100%', display: 'flex', flexDirection: 'column' } : undefined}>
      <style>{`
        .df-marker-halo { animation: df-halo 1.6s ease-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes df-halo { 0% { opacity: .55; transform: scale(1); } 100% { opacity: 0; transform: scale(1.12); } }
        .df-map:active { cursor: grabbing !important; }
        @media (prefers-reduced-motion: reduce) { .df-marker-halo { animation: none; opacity: .4; } }
      `}</style>
      {/* Camera bar: the step being followed, and a switch between following the money and the whole map. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '6px 6px 10px' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step ?? (done ? 'done' : 'all')} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.25, ease: EASE }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: step ? 'var(--text)' : done ? 'var(--pos)' : 'var(--ter)' }} />
            {step ? `Paso ${step} de 5 · ${STEP_LABEL[step]}` : done ? 'Recorrido completo' : 'Mapa del recorrido'}
          </motion.div>
        </AnimatePresence>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {controls}
        <div role="group" aria-label="Cámara" style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 999, padding: 3 }}>
          {([[true, 'Seguir el dinero'], [false, 'Ver todo']] as const).map(([v, label]) => (
            <button key={label} type="button" aria-pressed={follow === v} onClick={() => setFollow(v)}
              style={{ border: 'none', cursor: 'pointer', borderRadius: 999, padding: '5px 11px', fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 700, background: follow === v ? 'var(--surface)' : 'transparent', color: follow === v ? 'var(--text)' : 'var(--sec)', boxShadow: follow === v ? 'var(--sh-sm)' : 'none', transition: 'background .2s, color .2s' }}>
              {label}
            </button>
          ))}
        </div>
        </div>
      </div>
      <div style={{ position: 'relative', ...(fill ? { flex: 1, minHeight: 0 } : {}) }}>
      <motion.svg className="df-map" ref={svgRef} {...pan} onPointerCancel={pan.onPointerUp} viewBox={viewBox} width="100%" role="img" aria-label={`Mapa del flujo${step ? `, paso ${step}: ${STEP_LABEL[step]}` : ''}`}
        style={{ display: 'block', borderRadius: 18, background: 'var(--bg)', cursor: 'grab', touchAction: 'none', userSelect: 'none', ...(fill ? { height: '100%' } : { aspectRatio: `${l.w} / ${l.h}` }) }}>
        <defs>
          <pattern id="df-dots" width={22} height={22} patternUnits="userSpaceOnUse">
            <circle cx={1.5} cy={1.5} r={1.2} style={{ fill: 'var(--border)' }} />
          </pattern>
          <filter id="df-shadow" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx={0} dy={6} stdDeviation={9} floodColor="#0f1219" floodOpacity={0.09} />
          </filter>
          <clipPath id="df-project-clip"><circle r={R} /></clipPath>
        </defs>
        <rect x={-l.w} y={-l.h} width={l.w * 3} height={l.h * 3} fill="url(#df-dots)" />

        {/* Routes (always), then the flows that are moving now, then nodes and step markers on top. */}
        <g>
          {ws.slice(0, mine).map((w, i) => <Route key={`rf${i}`} d={curve(l.source, w, 0.08)} />)}
          {ws.map((w, i) => <Route key={`ri${i}`} d={curve(w, l.project, 0.06)} />)}
          {ws.slice(0, mine).map((w, i) => <Route key={`rs${i}`} d={curve(w, l.account, l.sweepBend)} />)}
          <Route d={curve(l.company, l.project, 0)} />
        </g>
        {ws.slice(0, mine).map((w, i) => <Edge key={`f${i}`} d={curve(l.source, w, 0.08)} state={fund(i)} tone="out" still={still} />)}
        {ws.map((w, i) => <Edge key={`i${i}`} d={curve(w, l.project, 0.06)} state={invest(i)} tone="out" still={still} />)}
        {ws.map((w, i) => <Edge key={`c${i}`} d={curve(l.project, w, 0.06)} state={claim(i)} tone="in" still={still} />)}
        {ws.slice(0, mine).map((w, i) => <Edge key={`s${i}`} d={curve(w, l.account, l.sweepBend)} state={sweep(i)} tone="in" still={still} />)}
        <Edge d={curve(l.company, l.project, 0)} state={deposit} tone="in" still={still} />
        {!simulated && <Edge d={curve(l.account, l.source, l.payoutBend)} state={payout} tone="in" still={still} />}

        <g style={dim('source')}>
          <Card at={l.source} w={236} h={110} caption="Entra el dinero" title={source.title} sub={paying ? 'Esperando tu pago' : p.payout ? `Te devolvimos ${payoutUsdt} USDT` : source.sub} accent={source.accent} active={step === 1} />
        </g>
        <g style={dim('company')}>
          <Card at={l.company} w={236} h={110} caption="Dueña del proyecto" title="Empresa" sub={p.deposit ? '+5 USD cargados' : 'Carga la ganancia'} active={step === 3} />
        </g>
        <g style={dim('account')}>
          <Card at={l.account} w={236} h={110} caption="Tu wallet" title="Tu cuenta" sub={p.swept ? `+${p.swept} USD recibidos` : 'Aquí se junta todo'} active={step === 5 || done} />
        </g>

        <g transform={`translate(${l.project.x},${l.project.y})`} style={dim('project')}>
          <circle r={R + 12} style={{ fill: 'none', stroke: 'var(--border)', strokeWidth: 6 }} />
          {/* Progress ring: tokens sold out of 5. */}
          <circle r={R + 12} transform="rotate(-90)" pathLength={5}
            style={{ fill: 'none', stroke: 'var(--text)', strokeWidth: 6, strokeLinecap: 'round', strokeDasharray: `${p.invested} 5`, opacity: p.invested ? 1 : 0, transition: 'stroke-dasharray .8s cubic-bezier(.16,1,.3,1)' }} />
          <g clipPath="url(#df-project-clip)" filter="url(#df-shadow)">
            <image href={image} x={-R * 1.6} y={-R} width={R * 3.2} height={R * 2} preserveAspectRatio="xMidYMid slice" />
            <rect x={-R} y={R * 0.12} width={R * 2} height={R} style={{ fill: 'rgba(8,8,10,0.6)' }} />
          </g>
          <text y={R * 0.47} textAnchor="middle" style={{ fill: '#fff', font: '800 19px var(--font-h)' }}>Villa Mirador</text>
          <text y={R * 0.47 + 21} textAnchor="middle" style={{ fill: 'rgba(255,255,255,0.82)', font: '600 14px var(--font-b)', fontVariantNumeric: 'tabular-nums' }}>{`${p.invested} de 5 partes`}</text>
        </g>

        <g style={dim('wallets')}>
          {ws.map((w, i) => <WalletNode key={i} at={w} index={i} state={p.wallet(i)} address={wallets[i]} mine={i < mine} />)}
        </g>

        {markers.map(m => <Marker key={m.step} at={l.markers[m.step]} step={m.step} detail={m.detail} state={markerState(m.step)} />)}
      </motion.svg>
      {/* Camera controls: zoom, and back to the guided shot once the user moved the map. */}
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
        {manual && (
          <button type="button" onClick={() => setManualKey(null)}
            style={{ border: '1px solid var(--text)', background: 'var(--text)', color: 'var(--bg)', borderRadius: 999, padding: '7px 13px', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 700, boxShadow: 'var(--sh-md)' }}>
            ↺ Retomar la explicación
          </button>
        )}
        {([['+', 'Acercar', 1 / 1.3], ['−', 'Alejar', 1.3]] as const).map(([t, label, f]) => (
          <button key={t} type="button" aria-label={label} onClick={() => zoomAt(f)}
            style={{ width: 34, height: 34, borderRadius: 999, border: '1px solid var(--border)', background: 'linear-gradient(var(--surface), var(--surface)), var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: 18, fontWeight: 700, lineHeight: 1, boxShadow: 'var(--sh-sm)' }}>{t}</button>
        ))}
      </div>
      {anchor && (
        <div style={{ position: 'absolute', bottom: 12, ...(mobile ? { left: 10, right: 10 } : { [corner]: 14, width: 350 }) }}>{anchor}</div>
      )}
      </div>

    </div>
  );
}
