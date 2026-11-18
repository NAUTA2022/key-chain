/**
 * Sections that are built and kept in the codebase but switched off for now (client demos show
 * the investor flow only). Hidden means: no menu entry, no prerender/sitemap entry, and the
 * route redirects to /tokenizaciones (see app/layouts/section-gate.tsx).
 *
 * To bring a section back, remove it from HIDDEN_SECTIONS. Nothing else needs to change.
 * No pure-TS imports here: react-router.config.ts also loads this file at build time.
 */
export type SectionKey = 'feed' | 'token' | 'ecosistema' | 'subsidiarias';

export const HIDDEN_SECTIONS: readonly SectionKey[] = ['feed', 'token', 'ecosistema', 'subsidiarias'];

/** URL prefixes each section owns (a prefix matches itself and anything below it). */
export const SECTION_PATHS: Record<SectionKey, readonly string[]> = {
  feed: ['/feed'],
  token: ['/token'],
  ecosistema: ['/ecosistema'],
  // The standalone products opened from the "Subsidiarias" menu. KeyPay is the payment rail, so it stays.
  subsidiarias: ['/bookey', '/key-drive', '/key-jobs', '/key-rural', '/escrow-chain', '/tracker-gps'],
};

/** Menu entry ids (sidebar, drawer, mobile bar) that belong to a hidden section. */
export const HIDDEN_NAV_IDS: ReadonlySet<string> = new Set<string>(HIDDEN_SECTIONS);

export function isHiddenPath(pathname: string): boolean {
  return HIDDEN_SECTIONS.some(key => SECTION_PATHS[key].some(p => pathname === p || pathname.startsWith(`${p}/`)));
}
