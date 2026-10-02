import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Small live illustrations that fill the Magic Bento cards on the landing.
const BLUE = '#7fb2ff', VIOLET = '#a78bfa', GREEN = '#4ade80';
const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };

function useTicker(n, ms) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % n), ms);
    return () => clearInterval(id);
  }, [n, ms]);
  return i;
}

// Contract being scanned line by line, then stamped "Auditado".
export function AuditVisual() {
  const lines = ['function mint(address to)', 'require(kyc[to], "KYC");', 'emit Distribution(usdc);', 'onlyRole(ESCROW)'];
  return (
    <div style={{ position: 'relative', borderRadius: 12, border: '1px solid rgba(127,178,255,0.18)', background: 'rgba(8,12,24,0.7)', padding: '10px 12px', overflow: 'hidden' }}>
      {lines.map((l, i) => (
        <div key={l} style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, whiteSpace: 'nowrap' }}>
          <span style={{ color: 'rgba(127,178,255,0.5)', marginRight: 8 }}>{i + 1}</span>{l}
        </div>
      ))}
      <motion.div animate={{ top: ['-20%', '110%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', left: 0, right: 0, height: 26, background: `linear-gradient(180deg, transparent, ${BLUE}33, transparent)`, borderBottom: `1px solid ${BLUE}88` }} />
      <motion.div animate={{ scale: [0.9, 1, 1, 0.9], opacity: [0, 1, 1, 0] }} transition={{ duration: 2.4, repeat: Infinity, times: [0.55, 0.65, 0.95, 1] }}
        style={{ position: 'absolute', right: 10, bottom: 8, padding: '3px 9px', borderRadius: 999, background: `${GREEN}22`, border: `1px solid ${GREEN}66`, color: GREEN, fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-b)' }}>
        ✓ Auditado · CertiK
      </motion.div>
    </div>
  );
}

// Vault dial turning, lock pulsing.
export function VaultVisual() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', width: 74, height: 74, flexShrink: 0 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px dashed ${BLUE}66` }} />
        <motion.div animate={{ rotate: [-40, 80, 10, -40] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', inset: 12, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #1d2a48, #0a1020)', border: `1px solid ${BLUE}55`, boxShadow: `0 0 24px ${BLUE}33` }}>
          <div style={{ position: 'absolute', top: 4, left: '50%', width: 3, height: 12, marginLeft: -1.5, borderRadius: 2, background: BLUE }} />
        </motion.div>
      </div>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
        <div><span style={{ color: GREEN }}>●</span> Custodio verificado</div>
        <div><span style={{ color: GREEN }}>●</span> Póliza de seguro activa</div>
        <div><span style={{ color: GREEN }}>●</span> Auditoría física trimestral</div>
      </div>
    </div>
  );
}

// Monthly USDC payouts growing + a live "payout received" toast.
const PAYOUTS = [
  ['Campo Agrícola Pergamino', 412], ['Flota Tesla Model 3', 186.5], ['Edificio Palermo', 240], ['Drones DJI', 139.35], ['Viñedo Valle de Uco', 98.2],
];
export function YieldVisual() {
  const i = useTicker(PAYOUTS.length, 2200);
  const bars = [38, 44, 41, 52, 58, 55, 66, 72, 70, 81, 88, 96];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110, padding: '0 2px' }}>
        {bars.map((h, k) => (
          <motion.div key={k} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: k * 0.05, duration: 0.6, ease: 'easeOut' }}
            style={{ flex: 1, borderRadius: '6px 6px 2px 2px', background: k === bars.length - 1 ? `linear-gradient(180deg, ${GREEN}, ${GREEN}55)` : `linear-gradient(180deg, ${BLUE}aa, ${BLUE}22)` }} />
        ))}
      </div>
      <div style={{ height: 46, marginTop: 12, position: 'relative' }}>
        <AnimatePresence mode="popLayout">
          <motion.div key={i} initial={{ y: 18, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -18, opacity: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderRadius: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#2775CA', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>$</span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Renta · {PAYOUTS[i][0]}</span>
            <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 14, color: GREEN }}>+{PAYOUTS[i][1].toFixed(2)} USDC</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Live P2P order book: asks vs real token value, discount highlighted.
const ORDERS = [
  ['Campo Pergamino', 92, 100], ['Viñedo Uco', 69, 75], ['Tesla Model 3', 41.5, 45], ['Edificio Palermo', 232, 250], ['BYD Delivery', 25, 27],
];
export function P2PVisual() {
  const i = useTicker(ORDERS.length, 1800);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[0, 1, 2].map(k => {
        const [n, ask, real] = ORDERS[(i + k) % ORDERS.length];
        const d = ((ask / real - 1) * 100).toFixed(1);
        return (
          <motion.div key={`${i}-${k}`} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1 - k * 0.22, x: 0 }} transition={{ duration: 0.35, delay: k * 0.05 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: k === 0 ? 'rgba(127,178,255,0.10)' : 'rgba(255,255,255,0.03)', border: `1px solid ${k === 0 ? 'rgba(127,178,255,0.35)' : 'rgba(255,255,255,0.06)'}` }}>
            <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n}</span>
            <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 13.5, color: '#fff' }}>${ask}</span>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'rgba(255,255,255,0.35)', textDecoration: 'line-through' }}>${real}</span>
            <span style={{ padding: '2px 7px', borderRadius: 999, background: `${GREEN}22`, color: GREEN, fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-b)' }}>{d}%</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// DAO vote bars filling up.
export function VoteVisual() {
  const i = useTicker(3, 2600);
  const props = [['Tokenizar Olivar Andaluz', 78], ['Bajar fee secundario a 0.8%', 64], ['Nuevo rubro: energía solar', 86]];
  const [t, yes] = props[i];
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Propuesta: {t}</div>
      <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex' }}>
        <motion.div key={i} initial={{ width: 0 }} animate={{ width: `${yes}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ background: `linear-gradient(90deg, ${VIOLET}, ${BLUE})`, boxShadow: `0 0 14px ${VIOLET}88` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
        <span style={{ color: VIOLET, fontWeight: 700 }}>A favor {yes}%</span><span>En contra {100 - yes}%</span>
      </div>
    </div>
  );
}

// KYC checklist ticking itself.
export function KycVisual() {
  const i = useTicker(5, 900);
  const items = ['DNI', 'Selfie', 'Verificación'];
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {items.map((t, k) => {
        const done = i > k;
        return (
          <motion.div key={t} animate={{ scale: done ? [1, 1.08, 1] : 1 }} transition={{ duration: 0.3 }}
            style={{ flex: 1, padding: '10px 6px', borderRadius: 12, textAlign: 'center', border: `1px solid ${done ? `${GREEN}66` : 'rgba(255,255,255,0.08)'}`, background: done ? `${GREEN}14` : 'rgba(255,255,255,0.03)', transition: 'all 0.3s' }}>
            <div style={{ fontSize: 16, color: done ? GREEN : 'rgba(255,255,255,0.25)', fontWeight: 800 }}>{done ? '✓' : '·'}</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: done ? '#fff' : 'rgba(255,255,255,0.4)', marginTop: 2 }}>{t}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

