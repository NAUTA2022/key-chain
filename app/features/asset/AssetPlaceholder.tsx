import { PBtn, PCard } from '~/components/ui';
import type { NavFn } from '~/lib/navigation';

type AssetPlaceholderProps = {
  state: 'loading' | 'error';
  nav: NavFn;
  onRetry: () => void;
};

/** Asset page while the project loads, or when the API could not be reached. */
export default function AssetPlaceholder({ state, nav, onRetry }: AssetPlaceholderProps) {
  return (
    <div className="g-page" style={{ padding: '24px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <PCard style={{ padding: '48px 28px', textAlign: 'center' }}>
        {state === 'loading' ? (
          <div role="status" style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--ter)' }}>Cargando proyecto…</div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: 'var(--text)', margin: '0 0 8px' }}>No pudimos cargar el proyecto</h1>
            <p style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', margin: '0 0 20px' }}>Revisá tu conexión e intentá de nuevo.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <PBtn variant="accent" small onClick={onRetry}>Reintentar</PBtn>
              <PBtn variant="secondary" small onClick={() => nav('primario')}>Ver tokenizaciones</PBtn>
            </div>
          </>
        )}
      </PCard>
    </div>
  );
}
