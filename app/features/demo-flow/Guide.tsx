import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PBtn } from '~/components/ui';
import type { GuideContent } from './guide-content';
import { usd, type GuideStep, type Hito } from './guide-data';

/** The receipt of the chosen hito: where the 5 USD of profit come from. */
export function HitoReceipt({ hito }: { hito: Hito }) {
  const total = hito.lines.reduce((a, [, v]) => a + v, 0);
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', fontVariantNumeric: 'tabular-nums' }}>
      {hito.lines.map(([label, v]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}><span>{label}</span><span>{v < 0 ? '−' : ''}{usd(Math.abs(v))} USD</span></div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, color: 'var(--text)', fontWeight: 700 }}>
        <span>Ganancia para repartir</span><span>{usd(total)} USD</span>
      </div>
    </div>
  );
}

export function Dots({ done, total = 5, label }: { done: number; total?: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'var(--sec)' }}>
      <span aria-hidden style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} style={{ width: 9, height: 9, borderRadius: 999, background: i < done ? 'var(--pos)' : 'var(--border)', transition: 'background .3s' }} />
        ))}
      </span>
      {label}
    </div>
  );
}

/** The small card the map shows next to the current step: what happens, and the way forward. */
export function CoachCard({ content, step, ready, onGo }: { content: GuideContent; step: GuideStep; ready: boolean; onGo: (s: GuideStep) => void }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.section key={`${step}-${content.title}`} aria-live="polite" aria-label={content.title}
        initial={{ opacity: 0, scale: 0.96, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        style={{ background: 'linear-gradient(var(--surface), var(--surface)), var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', boxShadow: 'var(--sh-lg)', display: 'grid', gap: 9 }}>
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 11, fontWeight: 700, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{content.kicker}</span>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1.2 }}>{content.title}</h3>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, lineHeight: 1.55, color: 'var(--sec)' }}>{content.body}</div>
        {content.status}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span aria-hidden style={{ display: 'flex', gap: 5 }}>{[1, 2, 3, 4, 5].map(i => <span key={i} style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 999, background: i <= step ? 'var(--text)' : 'var(--border)' }} />)}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {step > 1 && <PBtn variant="ghost" small onClick={() => onGo((step - 1) as GuideStep)}>Anterior</PBtn>}
            <PBtn variant="accent" small disabled={!ready} onClick={() => onGo((step + 1) as GuideStep)}>{ready ? (step === 5 ? 'Ver el resumen' : 'Siguiente') : 'Esperando…'}</PBtn>
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}

/** A moment that needs the user (intro, paying, choosing the profit, summary): a card over the map. */
export function StepPanel({ content, children, media }: { content: GuideContent; children?: ReactNode; media?: ReactNode }) {
  return (
    <motion.section aria-label={content.title} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ background: 'linear-gradient(var(--surface), var(--surface)), var(--bg)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--sh-lg)', overflow: 'hidden', maxHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {media}
      <div style={{ padding: '18px 20px', display: 'grid', gap: 12, overflowY: 'auto' }}>
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 700, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{content.kicker}</span>
        <h2 style={{ margin: '-4px 0 0', fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 21, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1.2 }}>{content.title}</h2>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 14.5, lineHeight: 1.55, color: 'var(--sec)' }}>{content.body}</div>
        {content.status}
        {children}
      </div>
    </motion.section>
  );
}
