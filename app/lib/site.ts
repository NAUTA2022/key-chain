/**
 * Canonical site metadata shared by <head> tags, JSON-LD, sitemap and robots.
 * SITE_URL comes from VITE_SITE_URL (or Vercel's production URL) at build time
 * so canonical links and Open Graph URLs are always absolute.
 */
export const SITE_URL: string = (import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

export const SITE_NAME = 'BRIKME';
export const SITE_LOCALE = 'es_LA';
export const SITE_LANG = 'es';
export const DEFAULT_DESCRIPTION =
  'Brikme, Real World Tokenization: marketplace de activos del mundo real (RWA) tokenizados. Invierte en real estate, energía, minería, agricultura, transporte y activos de lujo desde $200 USD. Registrada y licenciada en Dubái (VARA).';
export const DEFAULT_OG_IMAGE = '/og-image.jpg';

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
