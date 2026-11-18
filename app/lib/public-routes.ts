import { RWA_ASSETS } from '~/data';
import { isHiddenPath } from '~/lib/hiddenSections';

/** Every public, indexable URL. Feeds the sitemap and the prerender list. */
export const STATIC_PUBLIC_PATHS = [
  '/',
  '/tokenizaciones',
  '/mercado-secundario',
  '/token',
  '/academia',
  '/ayuda',
  '/terminos',
  '/privacidad',
  '/bookey',
] as const;

/** Signed-in areas and utility screens that must never be indexed. */
export const PRIVATE_PATHS = [
  '/ingresar', '/panel', '/checkout', '/pertenencias', '/inquilino', '/perfil',
  '/configuracion', '/tokenizar', '/swap', '/admin', '/keypay', '/feed', '/empresas', '/usuarios',
  // Products not yet public (admin-only preview).
  '/key-drive', '/key-jobs', '/key-rural', '/escrow-chain', '/tracker-gps',
] as const;

export function assetPaths(): string[] {
  return (RWA_ASSETS as Array<{ id: number }>).map(a => `/tokenizaciones/${a.id}`);
}

export function indexablePaths(): string[] {
  return [...STATIC_PUBLIC_PATHS, ...assetPaths()].filter(path => !isHiddenPath(path));
}
