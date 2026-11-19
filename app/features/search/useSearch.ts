import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ACADEMY_POSTS } from '~/data';
import { api, apiEnabled } from '~/lib/api/client';
import { useCatalog } from '~/lib/catalog';
import { pathFor, routeKeyFromPath, type NavState, type RouteKey } from '~/lib/navigation';
import { isInternalPath } from '~/lib/links';

export type SearchKind = 'asset' | 'post' | 'section';

export type SearchResult = {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  /** Internal path (always starts with '/'). */
  href: string;
  image?: string;
};

export type SearchGroup = { kind: SearchKind; label: string; items: SearchResult[] };

type PostEntry = { slug: string; title: string; category: string; excerpt: string };

type Section = { title: string; subtitle: string; keywords: string; adminOnly?: boolean } & ({ key: RouteKey } | { path: string });

const SECTIONS: Section[] = [
  { key: 'feed', title: 'Feed', subtitle: 'Hitos y novedades de los proyectos', keywords: 'feed inicio novedades hitos publicaciones empresas' },
  { key: 'dashboard', title: 'Mi dashboard', subtitle: 'Tu panel', keywords: 'panel dashboard resumen home' },
  { key: 'primario', title: 'Tokenizaciones', subtitle: 'Mercado primario', keywords: 'proyectos invertir mercado primario tokens rwa activos' },
  { key: 'secundario', title: 'Mercado secundario', subtitle: 'Compra y venta entre inversores', keywords: 'p2p comprar vender ordenes listados trading' },
  { key: 'token', title: 'Token BRIK', subtitle: 'Token de la plataforma', keywords: 'kycn token ico staking vesting tokenomics' },
  { key: 'pertenencias', title: 'Mis pertenencias', subtitle: 'Tu portafolio', keywords: 'wallet billetera portafolio cartera inversiones dividendos rendimientos cobrar holdings' },
  { key: 'ecosistema', title: 'Ecosistema', subtitle: 'Mapa del ecosistema', keywords: 'mapa 3d red productos' },
  { key: 'academia', title: 'Academia', subtitle: 'Guías y artículos', keywords: 'guias articulos aprender blog educacion' },
  { key: 'perfil', title: 'Perfil', subtitle: 'Cuenta y verificación KYC', keywords: 'cuenta kyc verificacion identidad datos seguridad email' },
  { key: 'ayuda', title: 'Ayuda', subtitle: 'Help Center y soporte', keywords: 'soporte help center faq preguntas tickets contacto' },
  { key: 'wizard', title: 'Tokenizar mi activo', subtitle: 'Solicitud de tokenización', keywords: 'tokenizar solicitud emitir activo emisor' },
  { key: 'swap', title: 'Swap', subtitle: 'Intercambio de tokens', keywords: 'intercambio cambiar usdc convertir' },
  { path: '/terminos', title: 'Términos y condiciones', subtitle: 'Legal', keywords: 'legal terminos condiciones' },
  { path: '/privacidad', title: 'Política de privacidad', subtitle: 'Legal', keywords: 'legal privacidad datos personales' },
  { key: 'admin', title: 'Panel admin', subtitle: 'Administración', keywords: 'administracion usuarios kyc aprobaciones', adminOnly: true },
  { key: 'config', title: 'Configuración', subtitle: 'Ajustes de la plataforma', keywords: 'ajustes settings banners mantenimiento red', adminOnly: true },
];

const LIMITS: Record<SearchKind, number> = { asset: 5, post: 3, section: 4 };
const LABELS: Record<SearchKind, string> = { asset: 'Proyectos', post: 'Academia', section: 'Secciones' };

/** Lowercase without accents, so "tecnologia" finds "Tecnología". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Academy posts: fetched once per page load (public endpoint) and shared by every search box.
const DEMO_POSTS: PostEntry[] = ACADEMY_POSTS.map(p => ({ slug: p.slug, title: p.title, category: p.cat, excerpt: p.excerpt }));
let postsCache: PostEntry[] | null = apiEnabled ? null : DEMO_POSTS;
let postsRequest: Promise<PostEntry[]> | null = null;

function loadPosts(): Promise<PostEntry[]> {
  if (postsCache) return Promise.resolve(postsCache);
  postsRequest ??= api.GET('/v1/academy/posts')
    .then(({ data }) => {
      if (!data) throw new Error('posts unavailable');
      postsCache = data.map(p => ({ slug: p.slug, title: p.title, category: p.category, excerpt: p.excerpt }));
      return postsCache;
    })
    .catch(() => {
      // Retry on the next search session.
      postsRequest = null;
      return [];
    });
  return postsRequest;
}

function usePosts(active: boolean): PostEntry[] {
  const [loaded, setLoaded] = useState<PostEntry[] | null>(null);
  useEffect(() => {
    if (!active || postsCache) return;
    let alive = true;
    void loadPosts().then(list => {
      if (alive) setLoaded(list);
    });
    return () => {
      alive = false;
    };
  }, [active]);
  return postsCache ?? loaded ?? [];
}

type Indexed = { result: SearchResult; title: string; hay: string };

function rank(entries: Indexed[], terms: string[], phrase: string, limit: number): SearchResult[] {
  const scored: Array<{ r: SearchResult; score: number }> = [];
  for (const e of entries) {
    if (!terms.every(t => e.hay.includes(t))) continue;
    let score = 1;
    if (e.title.startsWith(phrase)) score += 100;
    else if (e.title.includes(phrase)) score += 50;
    score += terms.filter(t => e.title.includes(t)).length * 10;
    scored.push({ r: e.result, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.r);
}

/**
 * Searches catalog assets (name, location, company, category, country), academy
 * posts and app sections. `active` starts loading the academy index.
 */
export function useSearch(query: string, opts: { isAdmin: boolean; active: boolean }): { groups: SearchGroup[]; flat: SearchResult[]; loading: boolean } {
  const { assets, loading: catalogLoading } = useCatalog();
  const posts = usePosts(opts.active);

  const assetIndex = useMemo<Indexed[]>(() => assets.map(a => ({
    title: normalize(a.name),
    hay: normalize([a.name, a.location, a.company, a.cat, a.country].join(' ')),
    result: { id: `asset-${a.id}`, kind: 'asset', title: a.name, subtitle: [a.cat, a.location].filter(Boolean).join(' · '), href: pathFor('detalle', { id: a.id }), image: a.img },
  })), [assets]);

  const postIndex = useMemo<Indexed[]>(() => posts.map(p => ({
    title: normalize(p.title),
    hay: normalize([p.title, p.category, p.excerpt].join(' ')),
    result: { id: `post-${p.slug}`, kind: 'post', title: p.title, subtitle: p.category, href: pathFor('articulo', { slug: p.slug }) },
  })), [posts]);

  const sectionIndex = useMemo<Indexed[]>(() => SECTIONS.filter(s => opts.isAdmin || !s.adminOnly).map(s => ({
    title: normalize(s.title),
    hay: normalize([s.title, s.subtitle, s.keywords].join(' ')),
    result: { id: `section-${s.title}`, kind: 'section', title: s.title, subtitle: s.subtitle, href: 'key' in s ? pathFor(s.key) : s.path },
  })), [opts.isAdmin]);

  return useMemo(() => {
    const phrase = normalize(query.trim()).replace(/\s+/g, ' ');
    if (phrase.length < 2) return { groups: [], flat: [], loading: false };
    const terms = phrase.split(' ');
    const groups: SearchGroup[] = ([
      ['asset', rank(assetIndex, terms, phrase, LIMITS.asset)],
      ['post', rank(postIndex, terms, phrase, LIMITS.post)],
      ['section', rank(sectionIndex, terms, phrase, LIMITS.section)],
    ] as const)
      .filter(([, items]) => items.length > 0)
      .map(([kind, items]) => ({ kind, label: LABELS[kind], items }));
    return { groups, flat: groups.flatMap(g => g.items), loading: catalogLoading };
  }, [query, assetIndex, postIndex, sectionIndex, catalogLoading]);
}

/** Navigates to a search result (internal paths only), keeping the "from" page like useNav(). */
export function useSearchNavigate(): (href: string) => void {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback((href: string) => {
    if (!isInternalPath(href)) return;
    const state: NavState = { from: routeKeyFromPath(pathname) };
    navigate(href, { state });
  }, [navigate, pathname]);
}
