import {
  Fragment, useEffect, useRef, useState,
  type CSSProperties, type InputHTMLAttributes, type MouseEventHandler, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Icons, PCard, PChip, PTag, type PBtnVariant } from '~/components/ui';
import { useHydrated } from '~/hooks/useHydrated';
import { useMobile } from '~/hooks/useMobile';
import { explorerUrl } from '~/lib/onchain';
import { shortHex } from './format';
import type { TagSpec } from './labels';
import { cardTitle, errText, fieldBase, fieldDisabled, fieldInvalid, labelText, linkBtn, sub, th } from './styles';

// Building blocks of the live admin. They reuse the P* primitives and the CSS
// variables of the design; everything is usable at 390px wide.

/** PBtn look with an explicit `type` (PBtn always submits inside a form). */
export function Btn({ children, variant = 'primary', onClick, small, disabled, type = 'button', style, ariaLabel }: {
  children?: ReactNode; variant?: PBtnVariant; onClick?: MouseEventHandler<HTMLButtonElement>; small?: boolean; disabled?: boolean;
  type?: 'button' | 'submit'; style?: CSSProperties; ariaLabel?: string;
}) {
  const variants: Record<PBtnVariant, CSSProperties> = {
    primary: { background: 'var(--text)', color: 'var(--bg)' },
    accent: { background: 'var(--accent)', color: 'var(--accent-fg)' },
    secondary: { background: 'transparent', color: 'var(--text)', border: '1.5px solid var(--border)' },
    ghost: { background: 'var(--surface2)', color: 'var(--text)' },
  };
  return (
    <motion.button
      type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}
      style={{
        padding: small ? '9px 16px' : '13px 22px', borderRadius: small ? 11 : 13, fontFamily: 'var(--font-b)', fontSize: small ? 13 : 14,
        fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', letterSpacing: '-0.01em', whiteSpace: 'nowrap',
        transition: 'opacity 0.15s', opacity: disabled ? 0.5 : 1, ...variants[variant], ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

export function Tag({ spec, style }: { spec: TagSpec; style?: CSSProperties }) {
  return <PTag label={spec.label} color={spec.color} style={style} />;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

/** Underlined tab strip of the admin (scrolls horizontally on mobile). */
export function TabBar<T extends string>({ tabs, active, onChange, ariaLabel }: {
  tabs: Array<{ id: T; label: string; badge?: number }>; active: T; onChange: (id: T) => void; ariaLabel: string;
}) {
  const mobile = useMobile();
  return (
    <div role="tablist" aria-label={ariaLabel} style={{ display: 'flex', gap: 4, boxShadow: 'inset 0 -1px 0 var(--border-l)', marginBottom: 20, overflowX: 'auto', scrollbarWidth: mobile ? 'none' : 'thin' }}>
      {tabs.map(t => (
        <button key={t.id} type="button" role="tab" aria-selected={active === t.id} onClick={() => onChange(t.id)} style={{
          padding: mobile ? '10px 14px' : '10px 15px', border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
          display: 'inline-flex', alignItems: 'center', gap: 7,
          fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: active === t.id ? 700 : 450,
          color: active === t.id ? 'var(--text)' : 'var(--ter)',
          borderBottom: `2px solid ${active === t.id ? 'var(--accent)' : 'transparent'}`,
        }}>
          {t.label}
          {t.badge ? (
            <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--neg)', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {t.badge > 99 ? '99+' : t.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/** Filter pills (single choice). */
export function Chips<T extends string>({ options, value, onChange, ariaLabel }: {
  options: Array<[value: T, label: string]>; value: T; onChange: (v: T) => void; ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', maxWidth: '100%' }}>
      {options.map(([v, label]) => <PChip key={v} label={label} active={v === value} onClick={() => onChange(v)} />)}
    </div>
  );
}

/** Card with a title row. */
export function Panel({ title, action, children, style }: { title?: ReactNode; action?: ReactNode; children?: ReactNode; style?: CSSProperties }) {
  return (
    <PCard style={{ padding: '18px 20px', overflow: 'visible', ...style }}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <h3 style={{ ...cardTitle, margin: 0 }}>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </PCard>
  );
}

/** KPI tile (same look as the demo admin KPIs). */
export function Kpi({ label, value, note, index = 0, onClick }: { label: string; value: ReactNode; note?: ReactNode; index?: number; onClick?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} style={{ minWidth: 0 }}>
      <PCard style={{ padding: '18px 22px', height: '100%', boxSizing: 'border-box' }} onClick={onClick}>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 26, color: 'var(--text)', letterSpacing: '-0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        {note && <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--sec)', marginTop: 4 }}>{note}</div>}
      </PCard>
    </motion.div>
  );
}

/** Table inside a card, scrolling horizontally on narrow screens, with its loading/empty/error note. */
export function DataTable({ head, children, minWidth = 760, loading = false, error = null, empty = false, emptyText }: {
  head: string[]; children?: ReactNode; minWidth?: number; loading?: boolean; error?: string | null; empty?: boolean; emptyText?: string;
}) {
  return (
    <PCard>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-l)' }}>
              {head.map((h, i) => <th key={`${h}-${i}`} scope="col" style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      <ListNote loading={loading} error={error} empty={empty} emptyText={emptyText} />
    </PCard>
  );
}

export function Row({ last, children, onClick }: { last?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} style={{ borderBottom: last ? 'none' : '1px solid var(--border-l)', cursor: onClick ? 'pointer' : undefined }}>
      {children}
    </tr>
  );
}

/** Loading / error / empty message for a list (renders nothing otherwise). */
export function ListNote({ loading, error, empty, emptyText = 'No hay resultados.' }: { loading: boolean; error: string | null; empty: boolean; emptyText?: string }) {
  const text = error ?? (empty ? (loading ? 'Cargando…' : emptyText) : null);
  if (!text) return null;
  return (
    <div role={error ? 'alert' : undefined} style={{ padding: '18px 16px', fontFamily: 'var(--font-b)', fontSize: 13, color: error ? 'var(--neg)' : 'var(--ter)' }}>
      {text}
    </div>
  );
}

export function LoadMore({ visible, busy, error, onClick }: { visible: boolean; busy: boolean; error: string | null; onClick: () => void }) {
  if (!visible && !error) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 14 }}>
      {visible && <Btn small variant="ghost" disabled={busy} onClick={onClick}>{busy ? 'Cargando…' : 'Cargar más'}</Btn>}
      {error && <span style={errText}>{error}</span>}
    </div>
  );
}

/** Label/value pairs. */
export function KV({ rows }: { rows: Array<[label: string, value: ReactNode]> }) {
  const mobile = useMobile();
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'minmax(130px, 34%) minmax(0, 1fr)', gap: mobile ? '2px 0' : '9px 14px', margin: 0 }}>
      {rows.map(([k, v]) => (
        <Fragment key={k}>
          <dt style={{ ...sub, fontWeight: 600, marginTop: mobile ? 8 : 0 }}>{k}</dt>
          <dd style={{ margin: 0, fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)', overflowWrap: 'anywhere' }}>{v}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

/** Success/error banner. */
export function Notice({ tone = 'ok', children }: { tone?: 'ok' | 'error'; children: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} style={{
      padding: '10px 14px', borderRadius: 12, fontFamily: 'var(--font-b)', fontSize: 13, lineHeight: 1.45,
      background: tone === 'error' ? 'var(--neg-bg)' : 'var(--accent-bg)', color: tone === 'error' ? 'var(--neg)' : 'var(--accent-text)',
    }}>
      {children}
    </div>
  );
}

// ─── Forms ───────────────────────────────────────────────────────────────────

/** Two columns on desktop, one on mobile. */
export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: number }) {
  const mobile = useMobile();
  return <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : `repeat(${cols}, minmax(0, 1fr))`, gap: 14 }}>{children}</div>;
}

/** Labelled control with hint and error. `group` renders a div (for composite controls). */
export function Field({ label, error, hint, children, span, group }: { label: ReactNode; error?: string; hint?: ReactNode; children: ReactNode; span?: boolean; group?: boolean }) {
  const style: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, gridColumn: span ? '1 / -1' : undefined, minWidth: 0 };
  const content = (
    <>
      {label ? <span style={labelText}>{label}</span> : null}
      {children}
      {hint && !error && <span style={sub}>{hint}</span>}
      {error && <span role="alert" style={errText}>{error}</span>}
    </>
  );
  return group ? <div style={style}>{content}</div> : <label style={style}>{content}</label>;
}

type Invalid = { invalid?: boolean };

/** Class of every admin form control: lets native pickers/dropdowns follow the app theme (see AdminFieldTheme). */
const FIELD_CLASS = 'kc-admin-field';
const fieldClass = (extra?: string) => (extra ? `${FIELD_CLASS} ${extra}` : FIELD_CLASS);

/** Native widgets (date picker, select popup) don't read CSS variables: pin their color scheme to the active theme. */
export function AdminFieldTheme() {
  return (
    <style>{`html:not([data-theme="light"]) .${FIELD_CLASS}{color-scheme:dark}html[data-theme="light"] .${FIELD_CLASS}{color-scheme:light}select.${FIELD_CLASS} option{background-color:var(--bg);color:var(--text)}`}</style>
  );
}

export function TextInput({ invalid, style, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & Invalid) {
  return <input {...rest} className={fieldClass(className)} aria-invalid={invalid || undefined} style={{ ...fieldBase, ...(invalid ? fieldInvalid : null), ...(rest.disabled ? fieldDisabled : null), ...style }} />;
}

export function TextArea({ invalid, style, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & Invalid) {
  return <textarea {...rest} className={fieldClass(className)} aria-invalid={invalid || undefined} style={{ ...fieldBase, minHeight: 96, resize: 'vertical', lineHeight: 1.5, ...(invalid ? fieldInvalid : null), ...(rest.disabled ? fieldDisabled : null), ...style }} />;
}

export function Select({ invalid, style, children, className, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & Invalid) {
  return (
    <select {...rest} className={fieldClass(className)} aria-invalid={invalid || undefined} style={{ ...fieldBase, cursor: 'pointer', ...(invalid ? fieldInvalid : null), ...(rest.disabled ? fieldDisabled : null), ...style }}>
      {children}
    </select>
  );
}

export function Check({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)' }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--text)', margin: 0 }} />
      {label}
    </label>
  );
}

// ─── Overlays ────────────────────────────────────────────────────────────────

function useEscape(onEscape: () => void, skipWhenConfirmOpen: boolean): void {
  const ref = useRef(onEscape);
  useEffect(() => {
    ref.current = onEscape;
  });
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (skipWhenConfirmOpen && document.querySelector('[data-admin-confirm]')) return;
      ref.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skipWhenConfirmOpen]);
}

/** Side panel (full screen on mobile) rendered on <body>, above the shell. */
export function Drawer({ title, subtitle, onClose, children, width = 720 }: { title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode; width?: number }) {
  const mobile = useMobile();
  const hydrated = useHydrated();
  const panel = useRef<HTMLElement>(null);
  useEscape(onClose, true);
  useEffect(() => {
    // Focus the panel and give focus back to the opener when it closes.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    return () => opener?.focus();
  }, [hydrated]);
  if (!hydrated) return null;
  return createPortal(
    <div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'flex-end' }}>
      <motion.section
        ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.2 }}
        style={{ width: mobile ? '100%' : `min(${width}px, 100%)`, height: '100%', background: 'var(--bg)', borderLeft: '1px solid var(--border-l)', boxShadow: 'var(--sh-lg)', display: 'flex', flexDirection: 'column', outline: 'none' }}
      >
        <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: mobile ? '14px 16px' : '18px 24px', borderBottom: '1px solid var(--border-l)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0, overflowWrap: 'anywhere' }}>{title}</h2>
            {subtitle && <div style={{ ...sub, marginTop: 4 }}>{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: mobile ? '16px 16px 48px' : '20px 24px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {children}
        </div>
      </motion.section>
    </div>,
    document.body,
  );
}

/** Centered confirmation dialog (see useConfirm). */
export function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onCancel }: {
  title: string; message?: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const hydrated = useHydrated();
  const confirmRef = useRef<HTMLDivElement>(null);
  useEscape(onCancel, false);
  useEffect(() => {
    // Destructive confirmations start on "Cancelar" so Enter never deletes by accident; focus returns to the opener.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const buttons = confirmRef.current?.querySelectorAll<HTMLButtonElement>('button');
    buttons?.[danger ? 0 : buttons.length - 1]?.focus();
    return () => opener?.focus();
  }, [hydrated, danger]);
  if (!hydrated) return null;
  return createPortal(
    <div data-admin-confirm="" onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div ref={confirmRef} role="alertdialog" aria-modal="true" aria-label={title} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.15 }}
        style={{ width: '100%', maxWidth: 420, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--sh-lg)', padding: '22px 22px 18px' }}>
        <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>{title}</h2>
        {message && <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.55, marginTop: 10 }}>{message}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          <Btn small variant="secondary" onClick={onCancel}>Cancelar</Btn>
          <motion.button
            type="button" onClick={onConfirm} whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '9px 16px', borderRadius: 11, fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
              background: danger ? 'var(--neg)' : 'var(--accent)', color: danger ? '#fff' : 'var(--accent-fg)' }}
          >
            {confirmLabel}
          </motion.button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

// ─── On-chain bits ───────────────────────────────────────────────────────────

/** Short hash/address with copy and block-explorer link (when the network has one). */
export function Hash({ value, kind, chainId }: { value: string | null | undefined; kind: 'tx' | 'address'; chainId?: number | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span style={{ color: 'var(--ter)' }}>—</span>;
  const href = explorerUrl(kind, value, chainId ?? undefined);
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-b)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" title={value} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {shortHex(value)} {Icons.ext}
        </a>
      ) : (
        <span title={value} style={{ fontWeight: 600, color: 'var(--text)' }}>{shortHex(value)}</span>
      )}
      <button type="button" onClick={copy} aria-label={kind === 'tx' ? 'Copiar hash' : 'Copiar dirección'} style={linkBtn}>{copied ? 'Copiado' : 'Copiar'}</button>
    </span>
  );
}
