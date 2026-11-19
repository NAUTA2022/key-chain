import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobile } from '~/hooks/useMobile';
import { networkById, type PayNetwork, type PayToken } from '~/lib/wallet';
import { useT } from '~/i18n/useT';
import { T, Ico } from './payTheme';

// Shared building blocks for Brikme's own payment flows (deposit,
// withdraw, checkout). Built on the platform's design tokens so they follow
// light/dark themes like every other screen.

type TokenIconProps = { src: string; size?: number; badge?: string };

export function TokenIcon({ src, size = 28, badge }: TokenIconProps) {
  return (
    <span style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'inline-flex' }}>
      <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'contain' }} />
      {badge && (
        <img src={badge} alt="" style={{ position: 'absolute', right: -3, bottom: -3, width: size * 0.48, height: size * 0.48, borderRadius: '50%', border: '2px solid var(--surface)', background: 'var(--surface)', objectFit: 'contain' }} />
      )}
    </span>
  );
}

type PayModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  onBack?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
};

// Centered modal on desktop, bottom sheet on phones.
export function PayModal({ open, onClose, title, onBack, children, footer, width = 460 }: PayModalProps) {
  const isMobile = useMobile();
  const { t } = useT('market');
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [open, onClose]);
  const iconBtn: CSSProperties = { width: 34, height: 34, borderRadius: 11, border: '1px solid var(--border-l)', background: 'var(--surface2)', color: 'var(--sec)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
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
              {onBack ? <button type="button" aria-label={t('pay.back')} onClick={onBack} style={iconBtn}>{Ico.back}</button> : null}
              <h2 style={{ ...T.title, flex: 1, fontSize: 17, margin: 0 }}>{title}</h2>
              <button type="button" aria-label={t('pay.close')} onClick={onClose} style={iconBtn}>{Ico.close}</button>
            </div>
            <div style={{ padding: isMobile ? '4px 18px 18px' : '4px 22px 22px', overflowY: 'auto', flex: 1 }}>{children}</div>
            {footer && <div style={{ padding: isMobile ? '12px 18px calc(16px + env(safe-area-inset-bottom))' : '14px 22px 20px', borderTop: '1px solid var(--border-l)' }}>{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type BtnProps = { children?: ReactNode; onClick?: () => void; disabled?: boolean; style?: CSSProperties };

export function PrimaryBtn({ children, onClick, disabled, style }: BtnProps) {
  return (
    <motion.button type="button" onClick={onClick} disabled={disabled} whileTap={disabled ? undefined : { scale: 0.98 }}
      style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
        background: 'var(--text)', color: 'var(--surface)', fontFamily: 'var(--font-b)', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...style }}>
      {children}
    </motion.button>
  );
}

export function GhostBtn({ children, onClick, disabled, style }: BtnProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-l)', cursor: disabled ? 'not-allowed' : 'pointer', background: 'var(--surface)', color: 'var(--text)',
        fontFamily: 'var(--font-b)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...(disabled ? { opacity: 0.5 } : {}), ...style }}>
      {children}
    </button>
  );
}

type OptionRowProps = {
  selected: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  disabled?: boolean;
};

// Selectable row (token, network, payment method).
export function OptionRow({ selected, onClick, icon, title, sub, right, disabled }: OptionRowProps) {
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
        {selected && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>}
      </span>
    </button>
  );
}

type TokenNetworkPickerProps = {
  tokens: readonly PayToken[];
  /** Networks by id (default: the demo networks). Live passes only the platform network. */
  networks?: Readonly<Record<string, PayNetwork>>;
  sym: string;
  setSym: (sym: string) => void;
  net: string;
  setNet: (net: string) => void;
  balances: Readonly<Record<string, number>>;
  showBalance?: boolean;
};

// Token + network pickers stacked, used by deposit and withdraw.
export function TokenNetworkPicker({ tokens, networks, sym, setSym, net, setNet, balances, showBalance }: TokenNetworkPickerProps) {
  const { t, locale } = useT('market');
  const token = tokens.find(tk => tk.sym === sym) ?? tokens[0];
  const networkOf = (id: string): PayNetwork => networks?.[id] ?? networkById(id);
  return (
    <>
      <span style={T.label}>{t('pay.currency')}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {tokens.map(tk => (
          <OptionRow key={tk.sym} selected={sym === tk.sym} onClick={() => { setSym(tk.sym); if (!tk.networks.includes(net)) setNet(tk.networks[0]); }}
            icon={<TokenIcon src={tk.icon} size={32} />} title={tk.sym} sub={tk.name}
            right={showBalance ? <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', fontWeight: 600 }}>{(balances[tk.sym] || 0).toLocaleString(locale, { maximumFractionDigits: tk.decimals })}</span> : null} />
        ))}
      </div>
      <span style={T.label}>{t('pay.network')}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {token.networks.map(id => {
          const n = networkOf(id);
          return (
            <OptionRow key={id} selected={net === id} onClick={() => setNet(id)} icon={<TokenIcon src={n.icon} size={28} />}
              title={n.name} sub={n.sub ?? t('pay.arrivesIn', { eta: n.eta, count: n.confirmations })} />
          );
        })}
      </div>
    </>
  );
}

type CopyFieldProps = { value: string; label?: string; mono?: boolean };

export function CopyField({ value, label, mono = true }: CopyFieldProps) {
  const [done, setDone] = useState(false);
  const { t } = useT('market');
  const copy = () => {
    try { void navigator.clipboard?.writeText(value).catch(() => undefined); } catch { /* clipboard unavailable */ }
    setDone(true); setTimeout(() => setDone(false), 1400);
  };
  return (
    <div>
      {label && <span style={T.label}>{label}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 12px 14px', borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border-l)' }}>
        <span style={{ ...(mono ? T.mono : {}), flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text)', wordBreak: 'break-all', lineHeight: 1.45 }}>{value}</span>
        <button type="button" onClick={copy} aria-label={label ? t('pay.copyLabel', { label: label.toLowerCase() }) : t('pay.copy')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--text)', color: 'var(--surface)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
          {done ? Ico.check : Ico.copy}{done ? t('pay.copied') : t('pay.copy')}
        </button>
      </div>
    </div>
  );
}

type QrMatrix = { size: number; get: (row: number, col: number) => number };

/** The QR modules as an SVG: 1-module quiet zone, 6px modules, white plate (same output as the design). */
function qrSvg(m: QrMatrix): string {
  const border = 1;
  const px = 6;
  const side = (m.size + border * 2) * px;
  const d: string[] = [];
  for (let row = 0; row < m.size; row++) {
    for (let col = 0; col < m.size; col++) {
      if (m.get(row, col)) d.push(`M${(col + border) * px},${(row + border) * px}h${px}v${px}h-${px}z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}"><rect fill="#ffffff" width="${side}" height="${side}"/><path fill="#0b0d12" d="${d.join('')}"/></svg>`;
}

type QRCodeProps = { value: string; size?: number; logo?: string };

// Real, scannable QR (white plate so it reads in both themes) with the
// token/network badge in the middle. The encoder loads on demand.
export function QRCode({ value, size = 188, logo }: QRCodeProps) {
  const [qr, setQr] = useState<{ value: string; svg: string } | null>(null);
  const { t } = useT('market');
  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then(({ create }) => { if (alive) setQr({ value, svg: qrSvg(create(value, { errorCorrectionLevel: 'H' }).modules) }); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [value]);
  const svg = qr?.value === value ? qr.svg : '';
  return (
    <div role="img" aria-label={t('pay.qrOf', { value })} style={{ position: 'relative', width: size, height: size, borderRadius: 18, background: '#fff', padding: 10, boxSizing: 'border-box', boxShadow: '0 6px 24px rgba(0,0,0,0.12)' }}>
      <div style={{ width: '100%', height: '100%' }} className="kc-qr" dangerouslySetInnerHTML={{ __html: svg }} />
      {logo && (
        <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: size * 0.2, height: size * 0.2, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 4px #fff' }}>
          <img src={logo} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
        </span>
      )}
    </div>
  );
}

type NoticeProps = { children?: ReactNode; tone?: 'warn' | 'info' };

export function Notice({ children, tone = 'warn' }: NoticeProps) {
  const c = tone === 'warn' ? '#f5a623' : 'var(--sec)';
  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 14, background: tone === 'warn' ? 'rgba(245,166,35,0.10)' : 'var(--surface2)', border: `1px solid ${tone === 'warn' ? 'rgba(245,166,35,0.35)' : 'var(--border-l)'}` }}>
      <span style={{ color: c, display: 'flex', flexShrink: 0, marginTop: 1 }}>{tone === 'warn' ? Ico.warn : Ico.shield}</span>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

type KVProps = { k: ReactNode; v: ReactNode; strong?: boolean; mono?: boolean };

export function KV({ k, v, strong, mono }: KVProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '7px 0' }}>
      <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>{k}</span>
      <span style={{ ...(mono ? T.mono : { fontFamily: strong ? 'var(--font-h)' : 'var(--font-b)' }), fontSize: strong ? 16 : 13.5, fontWeight: strong ? 800 : 600, color: 'var(--text)', textAlign: 'right' }}>{v}</span>
    </div>
  );
}

export type ProgressStep = { label: string; sub?: string; ms?: number };

type ProgressStepsProps = {
  steps: readonly ProgressStep[];
  /** Timed mode (demo): called once every step completed. */
  onDone?: () => void;
  stepMs?: number;
  /** Controlled mode (live): index of the step in progress (steps.length = all done). No timers. */
  current?: number;
  /** Controlled mode: the step in progress failed. */
  failed?: boolean;
};

// Animated list of steps that complete one after another, then calls onDone.
// With `current` the real flow drives it instead of the timers.
export function ProgressSteps({ steps, onDone, stepMs = 900, current, failed }: ProgressStepsProps) {
  const [tick, setTick] = useState(0);
  const timed = current === undefined;
  useEffect(() => {
    if (!timed) return undefined;
    if (tick >= steps.length) { const t = setTimeout(() => onDone?.(), 350); return () => clearTimeout(t); }
    const t = setTimeout(() => setTick(v => v + 1), steps[tick]?.ms || stepMs);
    return () => clearTimeout(t);
  }, [timed, tick, steps, onDone, stepMs]);
  const i = current ?? tick;
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {steps.map((s, k) => {
        const done = k < i, now = k === i;
        const broken = now && failed;
        return (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', opacity: k > i ? 0.4 : 1, transition: 'opacity .3s' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? 'var(--text)' : 'transparent', color: broken ? 'var(--neg)' : 'var(--surface)', border: done ? 'none' : `1.5px solid ${broken ? 'var(--neg)' : 'var(--border)'}` }}>
              {done ? Ico.check : broken ? Ico.close : now ? <span className="kc-spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--text)' }} /> : null}
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
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><motion.path d="M5 12l5 5L20 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.15, duration: 0.4 }} /></svg>
    </motion.div>
  );
}
