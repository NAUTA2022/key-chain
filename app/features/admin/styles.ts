import type { CSSProperties } from 'react';

// Inline style tokens shared by the live admin (same values as the demo admin tables).

export const th: CSSProperties = {
  padding: '12px 16px', fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textAlign: 'left',
  textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap',
};
export const td: CSSProperties = { padding: '12px 16px', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)', verticalAlign: 'middle' };
export const tdStrong: CSSProperties = { ...td, fontFamily: 'var(--font-h)', fontWeight: 700 };
export const tdMuted: CSSProperties = { ...td, color: 'var(--sec)' };
export const tdDim: CSSProperties = { ...td, fontSize: 12.5, color: 'var(--ter)', whiteSpace: 'nowrap' };

export const strong: CSSProperties = { fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' };
export const sub: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' };
export const body: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.55 };
export const errText: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)' };
export const cardTitle: CSSProperties = { fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' };
export const labelText: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 600, color: 'var(--sec)' };

export const fieldBase: CSSProperties = {
  background: 'var(--surface)', borderRadius: 12, padding: '11px 14px', border: '1.5px solid var(--border)', width: '100%',
  boxSizing: 'border-box', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', outline: 'none', minWidth: 0,
};
export const fieldInvalid: CSSProperties = { borderColor: 'var(--neg)' };
export const fieldDisabled: CSSProperties = { opacity: 0.55, cursor: 'not-allowed' };

/** Toolbar row above a table: wraps on mobile. */
export const toolbar: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14 };

/** Small text-like button (copy, inline links). */
export const linkBtn: CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12,
  fontWeight: 600, color: 'var(--sec)', textDecoration: 'underline', textUnderlineOffset: 2,
};
