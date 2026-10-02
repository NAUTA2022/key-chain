import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AssetCard from '../AssetCard';

// "Cómo funciona": a phone showing the actual app screens for each step —
// ID scan, the real marketplace card, the buy sheet, and USDC payout
// notifications on the lock screen.
const ACCENT = '#7fb2ff';
const font = { fontFamily: 'var(--font-b)' };
const noop = () => {};

function StatusBar({ light }) {
  const c = light ? '#fff' : 'rgba(255,255,255,0.9)';
  return (
    <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px', ...font, fontSize: 13, fontWeight: 700, color: c, flexShrink: 0 }}>
      <span>9:41</span>
      <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill={c}><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none"><rect x="0.5" y="0.5" width="20" height="10" rx="3" stroke={c} opacity="0.5" /><rect x="2" y="2" width="15" height="7" rx="1.6" fill={c} /><rect x="21.5" y="3.5" width="1.5" height="4" rx="0.7" fill={c} opacity="0.5" /></svg>
      </span>
    </div>
  );
}

function AppHeader({ title, back }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 18px 12px', flexShrink: 0 }}>
      {back && <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>‹</span>}
      <span style={{ ...font, fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: '-0.01em' }}>{title}</span>
    </div>
  );
}

function KycScreen() {
  const [shot, setShot] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShot(true), 2200); return () => clearTimeout(t); }, []);
  const corner = (pos) => ({ position: 'absolute', width: 26, height: 26, borderColor: shot ? '#4ade80' : '#fff', borderStyle: 'solid', borderWidth: 0, transition: 'border-color .3s', ...pos });
  return (
    <>
      <AppHeader title="Verificación" back />
      <div style={{ padding: '0 18px', ...font }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Paso 1 de 3</div>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', marginBottom: 18 }}><div style={{ width: '33%', height: '100%', borderRadius: 2, background: ACCENT }} /></div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Frente de tu DNI</div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', marginBottom: 16, lineHeight: 1.45 }}>Ubicalo dentro del marco, con buena luz y sin reflejos.</div>
      </div>
      <div style={{ margin: '0 18px', height: 210, borderRadius: 18, background: 'radial-gradient(120% 90% at 50% 40%, #2a2f3a, #0d0f14)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: '28px 22px', borderRadius: 12, background: 'linear-gradient(135deg, #d9dde6, #b9c0cc)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', padding: 12, display: 'flex', gap: 10 }}>
          <div style={{ width: 54, borderRadius: 6, background: '#9aa3b2' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 2 }}>
            {[80, 60, 70, 45, 55].map((w, i) => <div key={i} style={{ height: 6, width: `${w}%`, borderRadius: 3, background: 'rgba(40,48,64,0.35)' }} />)}
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 18 }}>
          <div style={corner({ top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 })} />
          <div style={corner({ top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 })} />
          <div style={corner({ bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 })} />
          <div style={corner({ bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 })} />
        </div>
        <AnimatePresence>{shot && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'absolute', inset: 0, background: '#fff' }} />
        )}</AnimatePresence>
      </div>
      <div style={{ padding: '16px 18px 0', ...font }}>
        <div style={{ height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: 14,
          background: shot ? 'rgba(74,222,128,0.14)' : '#fff', color: shot ? '#4ade80' : '#05060a', border: shot ? '1px solid rgba(74,222,128,0.4)' : 'none', transition: 'all .3s' }}>
          {shot ? '✓ Foto lista' : 'Tomar foto'}
        </div>
      </div>
    </>
  );
}

function ExploreScreen({ asset, next }) {
  return (
    <>
      <AppHeader title="Tokenizaciones" />
      <div style={{ padding: '0 18px', ...font }}>
        <div style={{ height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', color: 'rgba(255,255,255,0.4)', fontSize: 12.5, marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          Buscar proyectos…
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {['Todos', 'Autos', 'Campos', 'Drones'].map((c, i) => (
            <span key={c} style={{ padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: i === 1 ? '#fff' : 'rgba(255,255,255,0.06)', color: i === 1 ? '#05060a' : 'rgba(255,255,255,0.6)' }}>{c}</span>
          ))}
        </div>
      </div>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', damping: 22 }}
        className="phone-card" style={{ padding: '0 14px', pointerEvents: 'none' }}>
        <AssetCard asset={asset} nav={noop} />
        {next && <div style={{ marginTop: 12 }}><AssetCard asset={next} nav={noop} /></div>}
      </motion.div>
    </>
  );
}

function BuyScreen({ asset }) {
  const [qty, setQty] = useState(1);
  useEffect(() => {
    let n = 1;
    const id = setInterval(() => { n += 1; setQty(n); if (n >= 10) clearInterval(id); }, 160);
    return () => clearInterval(id);
  }, []);
  const price = asset.tokenPrice;
  const total = qty * price;
  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <img src={asset.img} alt="" style={{ position: 'absolute', inset: '-44px 0 0', width: '100%', height: 300, objectFit: 'cover', opacity: 0.55 }} />
      <div style={{ position: 'absolute', inset: '-44px 0 0', height: 300, background: 'linear-gradient(180deg, rgba(0,0,0,0.2), #0b0d13)' }} />
      <motion.div initial={{ y: 220 }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        style={{ marginTop: 'auto', position: 'relative', background: '#141821', borderRadius: '24px 24px 0 0', padding: '10px 18px 22px', borderTop: '1px solid rgba(255,255,255,0.08)', ...font }}>
        <div style={{ width: 38, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Comprar tokens</div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>{asset.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</span>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 34, color: '#fff', lineHeight: 1 }}>{qty}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>tokens</div>
          </div>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</span>
        </div>
        {[['Precio por token', `$${price} USDC`], ['Renta estimada', `${asset.apy}% anual`], ['Total', `$${total.toLocaleString('en-US')} USDC`]].map(([k, v], i) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: i === 2 ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: i === 2 ? 800 : 500 }}>
            <span>{k}</span><span style={{ color: i === 1 ? '#4ade80' : undefined }}>{v}</span>
          </div>
        ))}
        <div style={{ marginTop: 14, height: 48, borderRadius: 14, background: '#fff', color: '#05060a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
          Pagar con Key Pay
        </div>
      </motion.div>
    </div>
  );
}

const PAYOUTS = [['Campo Agrícola Pergamino', '412,00'], ['Flota Tesla Model 3', '186,50'], ['Edificio Corporativo Palermo', '240,00']];
function LockScreen() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 70% at 30% 10%, #2b3d7a, #11162a 55%, #07080c)', display: 'flex', flexDirection: 'column' }}>
      <StatusBar light />
      <div style={{ textAlign: 'center', marginTop: 26, ...font, color: '#fff' }}>
        <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8 }}>jueves, 1 de octubre</div>
        <div style={{ fontFamily: 'var(--font-h)', fontSize: 74, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em' }}>9:41</div>
      </div>
      <div style={{ marginTop: 'auto', padding: '0 10px 30px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PAYOUTS.map(([p, v], i) => (
          <motion.div key={p} initial={{ y: 40, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.35 + i * 0.6, type: 'spring', damping: 20, stiffness: 220 }}
            style={{ display: 'flex', gap: 10, padding: '11px 12px', borderRadius: 18, background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', ...font }}>
            <img src="/icono.png" alt="" style={{ width: 34, height: 34, borderRadius: 9, background: '#fff', padding: 3, boxSizing: 'border-box', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#fff' }}><span>KEY CHAIN</span><span style={{ fontWeight: 500, opacity: 0.6 }}>{i === 0 ? 'ahora' : `hace ${i * 2} min`}</span></div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.35, marginTop: 1 }}>Recibiste <b>{v} USDC</b> de renta de {p}.</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function PhoneShowcase({ step, asset, next }) {
  const lock = step === 3;
  return (
    <div className="phone-wrap">
      <div className="phone">
        <div className="phone-screen">
          {!lock && <StatusBar />}
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28, ease: 'easeOut' }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
              {step === 0 && <KycScreen />}
              {step === 1 && <ExploreScreen asset={asset} next={next} />}
              {step === 2 && <BuyScreen asset={asset} />}
              {step === 3 && <LockScreen />}
            </motion.div>
          </AnimatePresence>
          <div className="phone-island" />
          <div className="phone-home" />
        </div>
      </div>
    </div>
  );
}
