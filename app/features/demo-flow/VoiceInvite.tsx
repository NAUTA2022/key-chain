import { useEffect, useRef } from 'react';
import { PBtn } from '~/components/ui';
import { useT } from '~/i18n/useT';

/** On arrival: invites the visitor to the narrated experience. The click is what lets the browser play audio. */
export default function VoiceInvite({ onChoose }: { onChoose: (on: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useT('market');
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog id="df-voice" ref={ref} aria-labelledby="df-voice-title" onCancel={e => { e.preventDefault(); onChoose(false); }}
      style={{ margin: 'auto', border: '1px solid var(--border)', borderRadius: 22, padding: 0, background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--sh-lg)', width: 'min(440px, calc(100vw - 32px))' }}>
      <style>{'#df-voice::backdrop{background:rgba(8,8,10,.55);backdrop-filter:blur(4px)}'}</style>
      <div style={{ padding: '26px 26px 22px', display: 'grid', gap: 14, textAlign: 'center', justifyItems: 'center' }}>
        <span aria-hidden style={{ width: 56, height: 56, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--text)', color: 'var(--bg)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </span>
        <h2 id="df-voice-title" style={{ margin: 0, fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{t('demo.voice.title')}</h2>
        <p style={{ margin: 0, fontFamily: 'var(--font-b)', fontSize: 15, lineHeight: 1.55, color: 'var(--sec)', maxWidth: '34ch' }}>
          {t('demo.voice.body')}
        </p>
        <div style={{ display: 'grid', gap: 8, width: '100%', marginTop: 4 }}>
          <PBtn variant="accent" onClick={() => { ref.current?.close(); onChoose(true); }} style={{ width: '100%', justifyContent: 'center' }}>{t('demo.voice.on')}</PBtn>
          <PBtn variant="ghost" onClick={() => { ref.current?.close(); onChoose(false); }} style={{ width: '100%', justifyContent: 'center' }}>{t('demo.voice.off')}</PBtn>
        </div>
      </div>
    </dialog>
  );
}
