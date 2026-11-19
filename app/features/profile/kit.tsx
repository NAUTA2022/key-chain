import { useEffect, useId, useRef, useState, type ChangeEvent, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PBtn, PCard } from '~/components/ui';
import { useHydrated } from '~/hooks/useHydrated';
import { useMobile } from '~/hooks/useMobile';
import { useT } from '~/i18n/useT';
import { checkFile } from './api';
import { bodyStyle, titleStyle } from './styles';

// UI kit for the live account pages (profile, support, tokenization). Same tokens
// and look as the P* primitives; adds the form/dialog pieces they lack.

const controlStyle: CSSProperties = {
  background: 'var(--surface)', borderRadius: 12, padding: '12px 16px', border: '1.5px solid var(--border)', width: '100%',
  boxSizing: 'border-box', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', outline: 'none',
};

// ─── Dialog ──────────────────────────────────────────────────────────────────

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Max width on desktop (px). */
  width?: number;
  /** Sticky footer (actions). */
  footer?: ReactNode;
};

// Open dialogs, innermost last: only the top one reacts to Escape/Tab (nested confirms).
const openStack: symbol[] = [];

// Hidden and file inputs (e.g. FileButton's) are never initial/trap focus targets.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]):not([type="file"]):not([hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Accessible modal dialog (portal, Escape, focus trap, focus restore). */
export function Modal({ open, onClose, title, children, width = 520, footer }: ModalProps) {
  const { t } = useT('profile');
  const isMobile = useMobile();
  const hydrated = useHydrated();
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const token = Symbol('modal');
    openStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (openStack[openStack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !boxRef.current) return;
      const items = Array.from(boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      const box = boxRef.current;
      const target = box?.querySelector<HTMLElement>('input:not([disabled]):not([type="file"]):not([type="hidden"]):not([hidden]), select:not([disabled]), textarea:not([disabled])') ?? box;
      target?.focus();
    }, 40);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      const i = openStack.indexOf(token);
      if (i >= 0) openStack.splice(i, 1);
      previous?.focus();
    };
  }, [open]);

  // Portals only exist on the client: nothing during prerender/hydration.
  if (!hydrated || typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={e => {
            if (e.target === e.currentTarget) closeRef.current();
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16,
          }}
        >
          <motion.div
            ref={boxRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 16, scale: isMobile ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            style={{
              width: '100%', maxWidth: isMobile ? '100%' : width, maxHeight: isMobile ? '92vh' : '88vh', display: 'flex', flexDirection: 'column',
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: isMobile ? '20px 20px 0 0' : 20, boxShadow: 'var(--sh-lg)',
              outline: 'none', overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: isMobile ? '16px 16px 12px' : '20px 24px 14px', borderBottom: '1px solid var(--border-l)' }}>
              <h2 id={titleId} style={{ ...titleStyle, fontSize: 17, margin: 0, minWidth: 0, overflowWrap: 'anywhere' }}>{title}</h2>
              <button
                type="button"
                aria-label={t('kit.close')}
                onClick={() => closeRef.current()}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--surface2)', color: 'var(--sec)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div style={{ padding: isMobile ? 16 : '18px 24px 22px', overflowY: 'auto', flex: 1 }}>{children}</div>
            {footer && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', padding: isMobile ? '12px 16px 18px' : '14px 24px 20px', borderTop: '1px solid var(--border-l)' }}>{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Confirmation dialog for destructive actions. */
export function ConfirmDialog({ open, title, children, confirmLabel, busy, onConfirm, onClose, danger = true }: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}) {
  const { t } = useT('profile');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={440}
      footer={
        <>
          <PBtn variant="secondary" small onClick={onClose} disabled={busy}>{t('kit.cancel')}</PBtn>
          <PBtn variant={danger ? 'primary' : 'accent'} small onClick={onConfirm} disabled={busy} style={danger ? { background: 'var(--neg)', color: '#fff' } : undefined}>
            {busy ? t('kit.processing') : confirmLabel}
          </PBtn>
        </>
      }
    >
      <div style={bodyStyle}>{children}</div>
    </Modal>
  );
}

// ─── Form controls ───────────────────────────────────────────────────────────

/** Visible label + control + hint/error, associated for screen readers. */
export function Field({ label, hint, error, children, htmlFor }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <label htmlFor={htmlFor} style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>{label}</label>
      {children}
      {error ? (
        <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)' }}>{error}</div>
      ) : hint ? (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{hint}</div>
      ) : null}
    </div>
  );
}

export function TextInput({ style, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...rest} aria-invalid={invalid || undefined} style={{ ...controlStyle, ...(invalid ? { borderColor: 'var(--neg)' } : null), ...(rest.disabled ? { opacity: 0.6 } : null), ...style }} />;
}

export function TextArea({ style, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...rest} aria-invalid={invalid || undefined} style={{ ...controlStyle, resize: 'vertical', lineHeight: 1.5, ...(invalid ? { borderColor: 'var(--neg)' } : null), ...style }} />;
}

export function Select({ style, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} style={{ ...controlStyle, cursor: 'pointer', ...style }}>{children}</select>;
}

/** On/off switch (same look as the profile privacy toggles). */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{ width: 44, height: 24, borderRadius: 999, background: checked ? 'var(--accent)' : 'var(--border)', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', flexShrink: 0, marginTop: 2, transition: 'background 0.2s', opacity: disabled ? 0.6 : 1 }}
    >
      <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

/**
 * Button that opens a file picker, validates type/size on the client and hands the
 * file over. Errors go to `onError` (null clears).
 */
export function FileButton({ label, accept, maxBytes, onFile, onError, disabled, small = true, variant = 'secondary', style }: {
  label: ReactNode;
  accept: readonly string[];
  maxBytes: number;
  onFile: (file: File) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
  small?: boolean;
  variant?: 'secondary' | 'accent' | 'ghost' | 'primary';
  style?: CSSProperties;
}) {
  const { t } = useT('profile');
  const ref = useRef<HTMLInputElement>(null);
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = checkFile(file, { types: accept, maxBytes }, t);
    onError(problem);
    if (!problem) onFile(file);
  };
  return (
    <>
      <input ref={ref} type="file" accept={accept.join(',')} onChange={onChange} hidden tabIndex={-1} aria-hidden="true" />
      <PBtn variant={variant} small={small} disabled={disabled} onClick={e => {
          // PBtn has no type: never let it submit an enclosing form.
          e.preventDefault();
          ref.current?.click();
        }} style={style}>{label}</PBtn>
    </>
  );
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export type NoticeTone = 'info' | 'error' | 'success' | 'warn';

export function Notice({ tone = 'info', children, style }: { tone?: NoticeTone; children: ReactNode; style?: CSSProperties }) {
  const map: Record<NoticeTone, [bg: string, fg: string]> = {
    info: ['var(--surface2)', 'var(--sec)'],
    error: ['var(--neg-bg)', 'var(--neg)'],
    success: ['var(--accent-bg)', 'var(--accent-text)'],
    warn: ['rgba(245,166,35,0.12)', '#B7791F'],
  };
  const [bg, fg] = map[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} style={{ background: bg, color: fg, borderRadius: 12, padding: '10px 14px', fontFamily: 'var(--font-b)', fontSize: 13, lineHeight: 1.5, ...style }}>
      {children}
    </div>
  );
}

/** Placeholder rows while data loads (no invented content). */
export function Skeleton({ rows = 3, height = 16 }: { rows?: number; height?: number }) {
  const { t } = useT('profile');
  return (
    <div aria-busy="true" aria-label={t('kit.loading')} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ height, borderRadius: 8, background: 'var(--surface2)', width: `${90 - i * 12}%`, opacity: 0.8 }} />
      ))}
    </div>
  );
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '28px 12px' }}>
      {icon && <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', color: 'var(--ter)', marginBottom: 10 }}>{icon}</div>}
      <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{title}</div>
      {text && <div style={{ ...bodyStyle, fontSize: 13, color: 'var(--ter)', marginTop: 6, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>{text}</div>}
      {action && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>{action}</div>}
    </div>
  );
}

/** Plain card section with a title row (used by the live tabs). */
export function Section({ title, action, children, style }: { title: ReactNode; action?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <PCard style={{ padding: '22px 24px', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h3 style={{ ...titleStyle, margin: 0 }}>{title}</h3>
        {action}
      </div>
      {children}
    </PCard>
  );
}

/** "Copiar" helper with a transient confirmation (`label` defaults to the translated "Copiar"). */
export function CopyButton({ value, label: labelProp, style }: { value: string; label?: string; style?: CSSProperties }) {
  const { t } = useT('profile');
  const label = labelProp ?? t('kit.copy');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => setCopied(true)).catch(() => undefined);
      }}
      aria-label={copied ? t('kit.copied') : `${label}: ${value}`}
      style={{ border: 'none', background: 'var(--surface2)', color: copied ? 'var(--accent-text)' : 'var(--sec)', borderRadius: 8, padding: '3px 8px', fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', ...style }}
    >
      {copied ? t('kit.copiedCheck') : label}
    </button>
  );
}
