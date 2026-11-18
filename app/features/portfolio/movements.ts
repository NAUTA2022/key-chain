import { fmtShortDate } from './format';
import type { ActivityItem } from './api';

/** One line of "Movimientos" (Mis Pertenencias). */
export type Movement = {
  id: string;
  inbound: boolean;
  label: string;
  /** Absolute USDC amount. */
  amount: number;
  date: string;
  status: string;
  /** Asset the movement belongs to (its name), when there is one. */
  assetName: string | null;
  /** Token the amount is in when it is not a dollar stablecoin (demo KYCN). */
  unit?: string;
};

/**
 * Money movements out of the API activity (`/v1/me/activity`): confirmed
 * investments, secondary-market trades and dividends. An order shows once:
 * confirmed, or pending while it has no outcome; failed orders moved no money.
 * Ids are `order:<id>:<created|minted|failed>`, `trade:<id>`, `dividend:<id>`.
 */
export function movementsFromActivity(items: readonly ActivityItem[]): Movement[] {
  const settled = new Set(items.filter(i => /^order:.+:(minted|failed)$/.test(i.id)).map(i => i.id.split(':')[1]));
  return [...items]
    .sort((a, b) => b.at.localeCompare(a.at))
    .flatMap(i => {
      if (i.amount === null) return [];
      const [kind, ref, state] = i.id.split(':');
      if (kind === 'order' && (state === 'failed' || (state === 'created' && settled.has(ref)))) return [];
      const assetName = i.detail ? i.detail.split(' · ')[0] : null;
      return [{
        id: i.id,
        inbound: i.type === 'dividend' || (kind === 'trade' && /venta/i.test(i.title)),
        label: assetName ? `${i.title} — ${assetName}` : i.title,
        amount: Math.abs(i.amount),
        date: fmtShortDate(i.at),
        status: kind === 'order' && state === 'created' ? 'Pendiente' : kind === 'dividend' ? 'Disponible' : 'Completado',
        assetName,
      }];
    });
}
