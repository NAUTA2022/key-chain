import { useState } from 'react';
import { PBtn, PCard } from '~/components/ui';
import { Notice } from '~/features/profile/kit';
import { useGuide, useGuidesSeen } from './context';
import { resetGuides } from './store';
import { useT } from '~/i18n/useT';

/** Perfil → Privacidad: forget every completed tour so they show again (synced to the account). */
export default function GuideResetCard() {
  const { enabled } = useGuide();
  const guides = useGuidesSeen();
  const { t } = useT('help');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'ok' | 'error' | null>(null);
  if (!enabled || !guides.userId) return null;

  async function reset() {
    setBusy(true);
    setResult(null);
    const ok = await resetGuides();
    setBusy(false);
    setResult(ok ? 'ok' : 'error');
  }

  return (
    <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px' }}>
          <h3 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>{t('guide.reset.title')}</h3>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>
            {t('guide.reset.text')}
          </div>
        </div>
        <PBtn variant="secondary" small disabled={busy} onClick={() => void reset()}>
          {busy ? t('guide.reset.saving') : t('guide.reset.button')}
        </PBtn>
      </div>
      {result === 'ok' && <Notice tone="success" style={{ marginTop: 12 }}>{t('guide.reset.ok')}</Notice>}
      {result === 'error' && <Notice tone="error" style={{ marginTop: 12 }}>{t('guide.reset.error')}</Notice>}
    </PCard>
  );
}
