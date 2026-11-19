/**
 * Canonical site metadata shared by <head> tags, JSON-LD, sitemap and robots.
 * SITE_URL comes from VITE_SITE_URL (or Vercel's production URL) at build time
 * so canonical links and Open Graph URLs are always absolute.
 */
export const SITE_URL: string = (import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

export const SITE_NAME = 'La 33';
export const SITE_LOCALE = 'es_PA';
export const SITE_LANG = 'es';
export const DEFAULT_DESCRIPTION =
  'La 33: tokenización B2B de activos tangibles en Panamá. Estructuramos y emitimos inmuebles, fincas, energía e infraestructura, y los conectamos con inversionistas en un marketplace multi-proyecto.';
export const DEFAULT_OG_IMAGE = '/og-image.jpg';

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
