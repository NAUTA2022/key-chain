import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { renderSVG } from 'uqr';
import { useMobile } from '../../hooks/useMobile';
import { NETWORKS, tokenBySym } from '../../lib/wallet';
import { T, Ico } from './payTheme';


// Shared building blocks for KEYCHAIN's own payment flows (deposit,
// withdraw, checkout). Built on the platform's design tokens so they follow
// light/dark themes like every other screen.

export function TokenIcon({ src, size = 28, badge }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'inline-flex' }}>
      <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'contain' }} />
      {badge && (
        <img src={badge} alt="" style={{ position: 'absolute', right: -3, bottom: -3, width: size * 0.48, height: size * 0.48, borderRadius: '50%', border: '2px solid var(--surface)', background: 'var(--surface)', objectFit: 'contain' }} />
      )}
    </span>
  );
}

// Centered modal on desktop, bottom sheet on phones.
export function PayModal({ open, onClose, title, onBack, children, footer, width = 460 }) {
  const isMobile = useMobile();
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [open, onClose]);
  const iconBtn = { width: 34, height: 34, borderRadius: 11, border: '1px solid var(--border-l)', background: 'var(--surface2)', color: 'var(--sec)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="pay-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(5,7,12,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}
            initial={isMobile ? { y: '100%' } : { opacity: 0, y: 16, scale: 0.98 }} animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, y: 16, scale: 0.98 }} transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            style={{ width: isMobile ? '100%' : width, maxWidth: '100%', maxHeight: isMobile ? '92vh' : '88vh', display: 'flex', flexDirection: 'column',
              background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: isMobile ? '24px 24px 0 0' : 24, boxShadow: 'var(--sh-lg)', overflow: 'hidden' }}>
            {isMobile && <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border)', margin: '10px auto 0' }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '12px 18px 12px' : '18px 22px 14px' }}>
              {onBack ? <button aria-label="Volver" onClick={onBack} style={iconBtn}>{Ico.back}</button> : null}
              <div style={{ ...T.title, flex: 1, fontSize: 17 }}>{title}</div>
              <button aria-label="Cerrar" onClick={onClose} style={iconBtn}>{Ico.close}</button>
            </div>
            <div style={{ padding: isMobile ? '4px 18px 18px' : '4px 22px 22px', overflowY: 'auto', flex: 1 }}>{children}</div>
            {footer && <div style={{ padding: isMobile ? '12px 18px calc(16px + env(safe-area-inset-bottom))' : '14px 22px 20px', borderTop: '1px solid var(--border-l)' }}>{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PrimaryBtn({ children, onClick, disabled, style }) {
  return (
    <motion.button type="button" onClick={onClick} disabled={disabled} whileTap={disabled ? undefined : { scale: 0.98 }}
      style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
        background: 'var(--text)', color: 'var(--surface)', fontFamily: 'var(--font-b)', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...style }}>
      {children}
    </motion.button>
  );
}

export function GhostBtn({ children, onClick, style }) {
  return (
    <button type="button" onClick={onClick}
      style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-l)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)',
        fontFamily: 'var(--font-b)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...style }}>
      {children}
    </button>
  );
}

// Selectable row (token, network, payment method).
export function OptionRow({ selected, onClick, icon, title, sub, right, disabled }) {
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} aria-pressed={selected}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', borderRadius: 14, cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
        border: `1.5px solid ${selected ? 'var(--text)' : 'var(--border-l)'}`, background: selected ? 'var(--surface2)' : 'var(--surface)', opacity: disabled ? 0.5 : 1, transition: 'border-color .15s, background .15s' }}>
      {icon}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-b)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
        {sub && <span style={{ display: 'block', fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{sub}</span>}
      </span>
      {right}
      <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `1.5px solid ${selected ? 'var(--text)' : 'var(--border)'}`, background: selected ? 'var(--text)' : 'transparent', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>}
      </span>
    </button>
  );
}

// Token + network pickers stacked, used by deposit and withdraw.
export function TokenNetworkPicker({ tokens, sym, setSym, net, setNet, balances, showBalance }) {
  const token = tokenBySym(sym);
  return (
    <>
      <span style={T.label}>Moneda</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {tokens.map(t => (
          <OptionRow key={t.sym} selected={sym === t.sym} onClick={() => { setSym(t.sym); if (!t.networks.includes(net)) setNet(t.networks[0]); }}
            icon={<TokenIcon src={t.icon} size={32} />} title={t.sym} sub={t.name}
            right={showBalance ? <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', fontWeight: 600 }}>{(balances[t.sym] || 0).toLocaleString('es-AR', { maximumFractionDigits: t.decimals })}</span> : null} />
        ))}
      </div>
      <span style={T.label}>Red</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {token.networks.map(id => {
          const n = NETWORKS[id];
          return (
            <OptionRow key={id} selected={net === id} onClick={() => setNet(id)} icon={<TokenIcon src={n.icon} size={28} />}
              title={n.name} sub={`Llega en ${n.eta} · ${n.confirmations} confirmaciones`} />
          );
        })}
      </div>
    </>
  );
}

export function CopyField({ value, label, mono = true }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    try { navigator.clipboard?.writeText(value); } catch { /* clipboard unavailable */ }
    setDone(true); setTimeout(() => setDone(false), 1400);
  };
  return (
    <div>
      {label && <span style={T.label}>{label}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 12px 14px', borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border-l)' }}>
        <span style={{ ...(mono ? T.mono : {}), flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text)', wordBreak: 'break-all', lineHeight: 1.45 }}>{value}</span>
        <button type="button" onClick={copy} aria-label="Copiar"
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--text)', color: 'var(--surface)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
          {done ? Ico.check : Ico.copy}{done ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}

// Real, scannable QR (white plate so it reads in both themes) with the
// token/network badge in the middle.
export function QRCode({ value, size = 188, logo }) {
  const svg = useMemo(() => renderSVG(value, { border: 1, ecc: 'H', pixelSize: 6, whiteColor: '#ffffff', blackColor: '#0b0d12' }), [value]);
  return (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: 18, background: '#fff', padding: 10, boxSizing: 'border-box', boxShadow: '0 6px 24px rgba(0,0,0,0.12)' }}>
      <div style={{ width: '100%', height: '100%' }} className="kc-qr" dangerouslySetInnerHTML={{ __html: svg }} />
      {logo && (
        <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: size * 0.2, height: size * 0.2, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 4px #fff' }}>
          <img src={logo} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
        </span>
      )}
    </div>
  );
}

export function Notice({ children, tone = 'warn' }) {
  const c = tone === 'warn' ? '#f5a623' : 'var(--sec)';
  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 14, background: tone === 'warn' ? 'rgba(245,166,35,0.10)' : 'var(--surface2)', border: `1px solid ${tone === 'warn' ? 'rgba(245,166,35,0.35)' : 'var(--border-l)'}` }}>
      <span style={{ color: c, display: 'flex', flexShrink: 0, marginTop: 1 }}>{tone === 'warn' ? Ico.warn : Ico.shield}</span>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

export function KV({ k, v, strong, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '7px 0' }}>
      <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>{k}</span>
      <span style={{ ...(mono ? T.mono : { fontFamily: strong ? 'var(--font-h)' : 'var(--font-b)' }), fontSize: strong ? 16 : 13.5, fontWeight: strong ? 800 : 600, color: 'var(--text)', textAlign: 'right' }}>{v}</span>
    </div>
  );
}

// Animated list of steps that complete one after another, then calls onDone.
export function ProgressSteps({ steps, onDone, stepMs = 900 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= steps.length) { const t = setTimeout(() => onDone?.(), 350); return () => clearTimeout(t); }
    const t = setTimeout(() => setI(v => v + 1), steps[i]?.ms || stepMs);
    return () => clearTimeout(t);
  }, [i, steps, onDone, stepMs]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {steps.map((s, k) => {
        const done = k < i, now = k === i;
        return (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', opacity: k > i ? 0.4 : 1, transition: 'opacity .3s' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? 'var(--text)' : 'transparent', color: 'var(--surface)', border: done ? 'none' : '1.5px solid var(--border)' }}>
              {done ? Ico.check : now ? <span className="kc-spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--text)' }} /> : null}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, fontWeight: now || done ? 700 : 500, color: 'var(--text)' }}>{s.label}</div>
              {s.sub && <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 1 }}>{s.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SuccessMark() {
  return (
    <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14, stiffness: 260 }}
      style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--pos)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 10px 30px color-mix(in oklab, var(--pos) 40%, transparent)' }}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><motion.path d="M5 12l5 5L20 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.15, duration: 0.4 }} /></svg>
    </motion.div>
  );
}
