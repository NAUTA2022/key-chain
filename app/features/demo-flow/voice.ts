import { useEffect, useRef, useState } from 'react';
import type { GuideStep, HitoId } from './guide-data';

/** Narration clips, one per guide moment. Files live in public/audio/demo-flow/<clip>.mp3 (script: docs/demo-flow-voz.md). */
export type VoiceClip =
  | '00-intro' | '01-elegir' | '01-esperando' | '01-listo' | '02-compra'
  | '03-elegir' | '03-rent' | '03-event' | '03-milestone' | '04-reparto' | '05-cuenta' | '06-resumen' | '06-resumen-real';

const CHOICE_KEY = 'kc.demo-flow.voice';
const SRC = (clip: VoiceClip) => `/audio/demo-flow/${clip}.mp3`;

/** The clip that tells what the guide card shows right now. */
export function voiceClip(step: GuideStep, ready: boolean, awaitingPayment: boolean, hito: HitoId, realMoney: boolean): VoiceClip {
  switch (step) {
    case 0: return '00-intro';
    case 1: return ready ? '01-listo' : awaitingPayment ? '01-esperando' : '01-elegir';
    case 2: return '02-compra';
    case 3: return ready ? `03-${hito}` : '03-elegir';
    case 4: return '04-reparto';
    case 5: return '05-cuenta';
    default: return realMoney ? '06-resumen-real' : '06-resumen';
  }
}

/**
 * Plays the clip of the current moment while the voice is on. The control only appears once the
 * audio files exist (the SPA answers unknown paths with HTML, so the content type decides).
 */
export function useNarration(clip: VoiceClip) {
  const [available, setAvailable] = useState(false);
  // The visitor's answer to the voice invitation, remembered for this tab (storage may be blocked).
  const [choice, setChoice] = useState<'on' | 'off' | null>(() => {
    try { const v = typeof window === 'undefined' ? null : sessionStorage.getItem(CHOICE_KEY); return v === 'on' || v === 'off' ? v : null; } catch { return null; }
  });
  const [on, setOn] = useState(choice === 'on');
  const [speaking, setSpeaking] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let live = true;
    fetch(SRC('00-intro'), { method: 'HEAD' })
      .then(r => { if (live) setAvailable(r.ok && (r.headers.get('content-type') ?? '').startsWith('audio')); })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!on) return;
    const a = audio.current ?? new Audio();
    audio.current = a;
    a.onplaying = () => setSpeaking(true);
    a.onended = a.onpause = () => setSpeaking(false);
    a.src = SRC(clip);
    // A missing clip or a blocked autoplay just stays silent; the guide text says the same.
    a.play().catch(() => setSpeaking(false));
    return () => a.pause();
  }, [clip, on]);

  const choose = (v: boolean) => {
    setChoice(v ? 'on' : 'off');
    setOn(v);
    try { sessionStorage.setItem(CHOICE_KEY, v ? 'on' : 'off'); } catch { /* storage unavailable */ }
  };
  return { available, on, speaking, ask: available && choice === null, choose, toggle: () => setOn(v => !v) };
}
