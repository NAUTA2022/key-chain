import { useState } from 'react';
import { PBtn, PCard } from '~/components/ui';
import { Notice } from '~/features/profile/kit';
import { useGuide, useGuidesSeen } from './context';
import { resetGuides } from './store';

/** Perfil → Privacidad: forget every completed tour so they show again (synced to the account). */
export default function GuideResetCard() {
  const { enabled } = useGuide();
  const guides = useGuidesSeen();
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
          <h3 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>Guías de la plataforma</h3>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>
            Vuelve a ver los recorridos que explican cada sección, como la primera vez. Se aplica en todos tus dispositivos.
          </div>
        </div>
        <PBtn variant="secondary" small disabled={busy} onClick={() => void reset()}>
          {busy ? 'Guardando…' : 'Volver a ver las guías'}
        </PBtn>
      </div>
      {result === 'ok' && <Notice tone="success" style={{ marginTop: 12 }}>Listo: cada sección te va a mostrar su guía la próxima vez que entres.</Notice>}
      {result === 'error' && <Notice tone="error" style={{ marginTop: 12 }}>No pudimos guardar el cambio. Prueba de nuevo.</Notice>}
    </PCard>
  );
}
