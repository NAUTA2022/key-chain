import { PBtn, PCard } from '~/components/ui';
import type { NavFn } from '~/lib/navigation';
import { useT } from '~/i18n/useT';

type AssetPlaceholderProps = {
  state: 'loading' | 'error';
  nav: NavFn;
  onRetry: () => void;
};

/** Asset page while the project loads, or when the API could not be reached. */
export default function AssetPlaceholder({ state, nav, onRetry }: AssetPlaceholderProps) {
  const { t } = useT('market');
  return (
    <div className="g-page" style={{ padding: '24px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <PCard style={{ padding: '48px 28px', textAlign: 'center' }}>
        {state === 'loading' ? (
          <div role="status" style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--ter)' }}>{t('asset.loading')}</div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: 'var(--text)', margin: '0 0 8px' }}>{t('asset.loadFailed')}</h1>
            <p style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', margin: '0 0 20px' }}>{t('asset.checkConnection')}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <PBtn variant="accent" small onClick={onRetry}>{t('asset.retry')}</PBtn>
              <PBtn variant="secondary" small onClick={() => nav('primario')}>{t('asset.viewTokenizations')}</PBtn>
            </div>
          </>
        )}
      </PCard>
    </div>
  );
}
