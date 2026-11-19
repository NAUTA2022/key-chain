import type { Translator } from '~/i18n/useT';

/**
 * Relative time ("hace 5 min", "2 days ago") for a notification timestamp, in the active language.
 * Pass the `t` and `locale` of `useT('common')` (texts under `notifications.time`).
 */
export function timeAgo(iso: string, now: number, t: Translator['t'], locale: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '';
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return t('notifications.time.now');
  const m = Math.floor(s / 60);
  if (m < 60) return t('notifications.time.minutes', { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('notifications.time.hours', { count: h });
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? t('notifications.time.day') : t('notifications.time.days', { count: d });
  const date = new Date(at);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  // Western digits in every language (as in the rest of the UI).
  return date.toLocaleDateString(locale, sameYear ? { day: 'numeric', month: 'short', numberingSystem: 'latn' } : { day: 'numeric', month: 'short', year: 'numeric', numberingSystem: 'latn' });
}
