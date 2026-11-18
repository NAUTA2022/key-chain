import type { CSSProperties } from 'react';

// Shared inline styles for the live account pages (same tokens as the P* primitives).

export const titleStyle: CSSProperties = { fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' };
export const mutedStyle: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' };
export const bodyStyle: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.6 };
export const labelStyle: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.06em' };
export const thStyle: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textAlign: 'left', padding: '0 12px 10px 0', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap' };
export const tdStyle: CSSProperties = { padding: '11px 12px 11px 0', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)', borderTop: '1px solid var(--border-l)', whiteSpace: 'nowrap' };
