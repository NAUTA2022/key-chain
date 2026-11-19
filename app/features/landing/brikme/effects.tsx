import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { BrikmeMark } from './geometry';

/*
 * "Lighting" effects for the Brikme landing (reference: scroll-lit SaaS
 * showcases): things light up as they enter, giant type rides the scroll,
 * a 3D cube turns inside a stack of repeated text, a horizon glows.
 */

/* ── Loader: 5 s with progress, then the stage starts dark ─────────── */

const LOADER_MS = 5000;

/**
 * Full-screen loader. Never faster than 5 s, and never ahead of the real download
 * of the 3D (`progress`, 0…1); it reaches 100% only once `done`.
 */
export function HeroLoader({ done, progress }: { done: boolean; progress: number }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setPct(p => Math.min(99, p + 1)), LOADER_MS / 100);
    return () => window.clearInterval(id);
  }, []);
  const shown = done ? 100 : Math.min(99, pct, Math.round(progress * 100));
  return (
    <motion.div className="bk-loader" aria-hidden="true" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: 'easeInOut' }}>
      <div className="bk-loader-mark"><BrikmeMark size={96} draw delay={0.15} /></div>
      <span className="bk-loader-word">BRIKME</span>
      <span className="bk-loader-tag">Real World Tokenization</span>
      <div className="bk-loader-bar"><i style={{ transform: `scaleX(${shown / 100})` }} /></div>
      <div className="bk-loader-meta"><span>Preparando la experiencia</span><span>{String(shown).padStart(3, '0')}%</span></div>
    </motion.div>
  );
}

/* ── Giant type riding the scroll ─────────────────────────────────── */

type GiantRow = { text: string; dir: 1 | -1; variant: 'thin' | 'outline' };

function GiantLine({ row, progress }: { row: GiantRow; progress: MotionValue<number> }) {
  const x = useTransform(progress, [0, 1], row.dir > 0 ? ['2%', '-38%'] : ['-38%', '2%']);
  return (
    <motion.div className={`bk-giant-row bk-giant-${row.variant}`} style={{ x }}>
      {[0, 1, 2].map(k => <span key={k}>{row.text}</span>)}
    </motion.div>
  );
}

export function GiantType({ rows }: { rows: readonly GiantRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  return (
    <div ref={ref} className="bk-giant" aria-hidden="true">
      {rows.map(r => <GiantLine key={r.text} row={r} progress={scrollYProgress} />)}
    </div>
  );
}

/* ── Horizon: a glowing planet edge rising behind the final CTA ───── */

export function Horizon({ progress }: { progress: MotionValue<number> }) {
  const y = useTransform(progress, [0, 0.7], ['38%', '0%']);
  const glow = useTransform(progress, [0.1, 0.6], [0.2, 1]);
  return (
    <motion.div className="bk-horizon" style={{ y, opacity: glow }} aria-hidden="true">
      <div className="bk-horizon-disc" />
    </motion.div>
  );
}
