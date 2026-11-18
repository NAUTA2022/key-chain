import type { DemoRun, Progress } from './api';

/** 0 = the story, 1–5 = the steps on the map, 6 = the summary. */
export type GuideStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type HitoId = 'rent' | 'event' | 'milestone';
export type Hito = { id: HitoId; title: string; story: string; lines: ReadonlyArray<readonly [string, number]> };

/**
 * What "generated" the profit. The 5 USD are always deposited the same way on-chain; the hito is
 * the plain-language reason a real project would have for paying its owners.
 */
export const HITOS: readonly Hito[] = [
  { id: 'rent', title: 'Alquiler del mes', story: 'La villa se alquiló 3 noches este mes.', lines: [['Alquiler cobrado', 5], ['Gastos', 0]] },
  { id: 'event', title: 'Evento en la villa', story: 'La villa se alquiló para un evento privado.', lines: [['Alquiler del evento', 7], ['Limpieza y personal', -2]] },
  { id: 'milestone', title: 'Hito de obra cumplido', story: 'Se terminó la piscina y el proyecto pagó un bono a sus dueños.', lines: [['Bono por hito cumplido', 5], ['Gastos', 0]] },
];

export const usd = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** How far the run really is, in guide steps. */
export function actualGuideStep(run: DemoRun | null, p: Progress): GuideStep {
  switch (run?.status) {
    case 'investing': return 2;
    case 'invested': return 3;
    case 'distributing': return !p.deposit ? 3 : p.claimed < 5 ? 4 : 5;
    case 'completed': return 6;
    case 'failed': return p.invested === 5 ? 4 : 2;
    default: return 1;
  }
}

