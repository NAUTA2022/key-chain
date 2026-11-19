import { Link } from 'react-router';
import { I18nProvider } from '~/i18n/I18nProvider';
import { useT } from '~/i18n/useT';

type Props = { code: string; title?: string; message?: string; detail?: string };

/**
 * Minimal 404 / error screen built on the platform's existing design tokens.
 * Without `title`/`message` it shows the translated 404 texts (code "404") or the generic error ones.
 */
export function StatusPage({ code, title, message, detail }: Props) {
  const { t } = useT('common');
  const kind = code === '404' ? 'notFound' : 'error';
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', color: 'var(--text)', lineHeight: 1 }}>{code}</p>
        <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginTop: 16 }}>{title ?? t(`status.${kind}.title`)}</h1>
        <p style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.6, marginTop: 8 }}>{message ?? t(`status.${kind}.message`)}</p>
        {detail && <pre style={{ fontSize: 12, color: 'var(--ter)', marginTop: 16, whiteSpace: 'pre-wrap' }}>{detail}</pre>}
        <Link
          to="/"
          style={{ display: 'inline-block', marginTop: 28, padding: '12px 22px', borderRadius: 12, background: 'var(--accent)', color: 'var(--accent-fg)', fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
        >
          {t('status.home')}
        </Link>
      </div>
    </main>
  );
}

function RouteErrorContent({ notFound, detail }: { notFound: boolean; detail?: string }) {
  const { t } = useT('common');
  return notFound ? <StatusPage code="404" /> : <StatusPage code={t('status.error.code')} detail={detail} />;
}

/**
 * The root error screen. The root ErrorBoundary renders outside the app's providers,
 * so it brings its own language provider (the visitor's saved language).
 */
export function RouteErrorPage({ notFound, detail }: { notFound: boolean; detail?: string }) {
  return (
    <I18nProvider>
      <RouteErrorContent notFound={notFound} detail={detail} />
    </I18nProvider>
  );
}
