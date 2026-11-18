import { Link } from 'react-router';

type Props = { code: string; title: string; message: string; detail?: string };

/** Minimal 404 / error screen built on the platform's existing design tokens. */
export function StatusPage({ code, title, message, detail }: Props) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', color: 'var(--text)', lineHeight: 1 }}>{code}</p>
        <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginTop: 16 }}>{title}</h1>
        <p style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.6, marginTop: 8 }}>{message}</p>
        {detail && <pre style={{ fontSize: 12, color: 'var(--ter)', marginTop: 16, whiteSpace: 'pre-wrap' }}>{detail}</pre>}
        <Link
          to="/"
          style={{ display: 'inline-block', marginTop: 28, padding: '12px 22px', borderRadius: 12, background: 'var(--accent)', color: 'var(--accent-fg)', fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
