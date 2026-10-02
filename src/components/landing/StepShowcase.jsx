import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// "Cómo funciona" showcase: one large card that shows, as a small live UI,
// what happens in the selected step (KYC → choose → invest → get paid).
const GREEN = '#4ade80';

function useCount(to, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, t0;
    const f = (t) => {
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / ms);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}

const row = { display: 'flex', alignItems: 'center', gap: 12 };
const label = { fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.45)' };

function KycScene({ tint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ position: 'relative', height: 150, borderRadius: 16, border: `1px solid ${tint}55`, background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', padding: 16, overflow: 'hidden', display: 'flex', gap: 16 }}>
        <div style={{ width: 86, borderRadius: 12, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={tint} strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 4 }}>
          {[70, 52, 84, 40].map((w, i) => <div key={i} style={{ height: 8, width: `${w}%`, borderRadius: 4, background: 'rgba(255,255,255,0.10)' }} />)}
        </div>
        <motion.div animate={{ top: ['-15%', '105%'] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
          style={{ position: 'absolute', left: 0, right: 0, height: 2, background: tint, boxShadow: `0 0 16px 4px ${tint}66` }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {['DNI frente y dorso', 'Selfie', 'Validación'].map((t, i) => (
          <motion.div key={t} initial={{ opacity: 0.35 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + i * 0.7 }}
            style={{ flex: 1, padding: '9px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', ...row, gap: 7 }}>
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 + i * 0.7, type: 'spring' }}
              style={{ width: 16, height: 16, borderRadius: '50%', background: GREEN, color: '#052e14', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</motion.span>
            <span style={{ ...label, color: 'rgba(255,255,255,0.75)', fontSize: 11.5 }}>{t}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ChooseScene({ tint, assets }) {
  const [sel, setSel] = useState(1);
  useEffect(() => { const id = setTimeout(() => setSel(0), 1500); return () => clearTimeout(id); }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {assets.slice(0, 3).map((a, i) => {
        const on = sel === i;
        return (
          <motion.div key={a.id} layout onClick={() => setSel(i)}
            style={{ ...row, padding: 10, borderRadius: 14, cursor: 'pointer', transition: 'all .25s',
              background: on ? `${tint}18` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? `${tint}88` : 'rgba(255,255,255,0.07)'}` }}>
            <img src={a.img} alt="" style={{ width: 52, height: 40, borderRadius: 9, objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 13, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
              <div style={label}>{a.cat} · {a.location}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 13, color: GREEN }}>{a.apy}%</span>
            <span style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${on ? tint : 'rgba(255,255,255,0.2)'}`, background: on ? tint : 'transparent', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on ? '✓' : ''}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

function InvestScene({ tint, asset }) {
  const tokens = Math.round(useCount(25, 1400));
  const price = asset?.tokenPrice || 1;
  return (
    <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: 16 }}>
      <div style={{ ...row, marginBottom: 14 }}>
        {asset && <img src={asset.img} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />}
        <div>
          <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 13.5, color: '#fff' }}>{asset?.name}</div>
          <div style={label}>Precio por token ${price}</div>
        </div>
      </div>
      <div style={{ ...row, justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={label}>Cantidad de tokens</span>
        <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: '#fff' }}>{tokens}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ width: `${(tokens / 25) * 60}%`, height: '100%', background: tint, boxShadow: `0 0 10px ${tint}` }} />
      </div>
      <div style={{ ...row, justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={label}>Total en USDC</span>
        <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, color: '#fff' }}>${(tokens * price).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
      </div>
      <motion.div animate={{ boxShadow: [`0 0 0 0 ${tint}55`, `0 0 0 10px ${tint}00`] }} transition={{ duration: 1.4, repeat: Infinity }}
        style={{ marginTop: 14, height: 40, borderRadius: 999, background: '#fff', color: '#05060a', fontFamily: 'var(--font-b)', fontWeight: 800, fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Confirmar inversión
      </motion.div>
    </div>
  );
}

function PayoutScene() {
  const bal = useCount(1278.4, 1600);
  const items = [['Campo Agrícola Pergamino', 412], ['Flota Tesla Model 3', 186.5], ['Edificio Palermo', 240]];
  return (
    <div>
      <div style={{ borderRadius: 16, padding: 16, marginBottom: 10, background: 'linear-gradient(135deg, rgba(74,222,128,0.14), rgba(74,222,128,0.03))', border: '1px solid rgba(74,222,128,0.3)' }}>
        <div style={label}>Rentas cobradas este año</div>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 30, color: '#fff', letterSpacing: '-0.02em' }}>
          ${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 14, color: GREEN }}>USDC</span>
        </div>
      </div>
      {items.map(([n, v], i) => (
        <motion.div key={n} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.35, type: 'spring', damping: 20 }}
          style={{ ...row, padding: '9px 12px', marginTop: 6, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#2775CA', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>$</span>
          <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n}</span>
          <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 13, color: GREEN }}>+{v.toFixed(2)}</span>
        </motion.div>
      ))}
    </div>
  );
}

export default function StepShowcase({ step, steps, assets }) {
  const s = steps[step];
  const scene = [
    <KycScene key="k" tint={s.tint} />,
    <ChooseScene key="c" tint={s.tint} assets={assets} />,
    <InvestScene key="i" tint={s.tint} asset={assets[0]} />,
    <PayoutScene key="p" />,
  ][step];
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', inset: '8% 6%', borderRadius: 40, background: `radial-gradient(circle, ${s.tint}40, transparent 70%)`, filter: 'blur(40px)', transition: 'background .6s', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', borderRadius: 24, padding: 22, minHeight: 340, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(160deg, rgba(20,24,38,0.92), rgba(9,11,18,0.95))', border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
        <div style={{ position: 'absolute', top: 0, left: '12%', right: '12%', height: 1, background: `linear-gradient(90deg, transparent, ${s.tint}, transparent)`, transition: 'background .6s' }} />
        <div style={{ ...row, justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ ...row, gap: 10 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.tint}22`, color: s.tint, border: `1px solid ${s.tint}55` }}>{s.icon}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: s.tint }}>PASO {s.n}</div>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 17, color: '#fff' }}>{s.t}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {steps.map((x, i) => <span key={x.n} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 999, background: i === step ? s.tint : 'rgba(255,255,255,0.15)', transition: 'all .3s' }} />)}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }} transition={{ duration: 0.35 }}>
            {scene}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
