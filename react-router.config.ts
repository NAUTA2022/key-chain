import type { Config } from '@react-router/dev/config';
import { ACADEMY_POSTS, RWA_ASSETS } from './app/data/index.js';
import { isHiddenPath } from './app/lib/hiddenSections.js';

// Static hosting (Vercel) with build-time prerendering: every public page is
// emitted as real HTML for crawlers and AI engines; signed-in areas are served
// by the SPA fallback (see vercel.json).
export default {
  appDirectory: 'app',
  ssr: false,
  async prerender() {
    const assets = (RWA_ASSETS as Array<{ id: number }>).map(a => `/tokenizaciones/${a.id}`);
    const posts = (ACADEMY_POSTS as Array<{ slug: string }>).map(p => `/academia/${p.slug}`);
    return [
      '/', '/ingresar',
      '/tokenizaciones', '/mercado-secundario', '/token', '/ecosistema', '/academia', '/ayuda', '/terminos', '/privacidad',
      '/bookey',
      '/robots.txt', '/sitemap.xml', '/llms.txt', '/404',
      ...assets,
      ...posts,
    ].filter(path => !isHiddenPath(path));
  },
} satisfies Config;
