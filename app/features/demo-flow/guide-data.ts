import type { TFn } from '~/features/market/i18n';
import type { DemoRun, Progress } from './api';

/** 0 = the story, 1–5 = the steps on the map, 6 = the summary. */
export type GuideStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type HitoId = 'rent' | 'event' | 'milestone';
export type Hito = { id: HitoId; title: string; story: string; lines: ReadonlyArray<readonly [string, number]> };

/**
 * What "generated" the profit. The 5 USD are always deposited the same way on-chain; the hito is
 * the plain-language reason a real project would have for paying its owners. Texts: `demo.hitos.<id>`.
 */
const HITO_LINES: ReadonlyArray<readonly [HitoId, ReadonlyArray<readonly ['income' | 'costs', number]>]> = [
  ['rent', [['income', 5], ['costs', 0]]],
  ['event', [['income', 7], ['costs', -2]]],
  ['milestone', [['income', 5], ['costs', 0]]],
];

/** The hitos in the active language (`t` from `useT('market')`). */
export function hitosFor(t: TFn): Hito[] {
  return HITO_LINES.map(([id, lines]) => ({
    id,
    title: t(`demo.hitos.${id}.title`),
    story: t(`demo.hitos.${id}.story`),
    lines: lines.map(([line, v]) => [t(`demo.hitos.${id}.lines.${line}`), v] as const),
  }));
}

export const usd = (n: number, locale = 'es-AR') => n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

