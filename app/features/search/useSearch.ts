import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ACADEMY_POSTS } from '~/data';
import { useT } from '~/i18n/useT';
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

/** `id`: the section's texts are `search.sections.<id>.title/subtitle` in `common`; `keywords` stay in Spanish (extra search terms). */
type Section = { id: string; keywords: string; adminOnly?: boolean } & ({ key: RouteKey } | { path: string });

const SECTIONS: Section[] = [
  { id: 'feed', key: 'feed', keywords: 'feed inicio novedades hitos publicaciones empresas' },
  { id: 'dashboard', key: 'dashboard', keywords: 'panel dashboard resumen home' },
  { id: 'primario', key: 'primario', keywords: 'proyectos invertir mercado primario tokens rwa activos' },
  { id: 'secundario', key: 'secundario', keywords: 'p2p comprar vender ordenes listados trading' },
  { id: 'token', key: 'token', keywords: 'kycn token ico staking vesting tokenomics' },
  { id: 'pertenencias', key: 'pertenencias', keywords: 'wallet billetera portafolio cartera inversiones dividendos rendimientos cobrar holdings' },
  { id: 'ecosistema', key: 'ecosistema', keywords: 'mapa 3d red productos' },
  { id: 'academia', key: 'academia', keywords: 'guias articulos aprender blog educacion' },
  { id: 'perfil', key: 'perfil', keywords: 'cuenta kyc verificacion identidad datos seguridad email' },
  { id: 'ayuda', key: 'ayuda', keywords: 'soporte help center faq preguntas tickets contacto' },
  { id: 'wizard', key: 'wizard', keywords: 'tokenizar solicitud emitir activo emisor' },
  { id: 'swap', key: 'swap', keywords: 'intercambio cambiar usdc convertir' },
  { id: 'terminos', path: '/terminos', keywords: 'legal terminos condiciones' },
  { id: 'privacidad', path: '/privacidad', keywords: 'legal privacidad datos personales' },
  { id: 'admin', key: 'admin', keywords: 'administracion usuarios kyc aprobaciones', adminOnly: true },
  { id: 'config', key: 'config', keywords: 'ajustes settings banners mantenimiento red', adminOnly: true },
];

const LIMITS: Record<SearchKind, number> = { asset: 5, post: 3, section: 4 };

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
  const { t, raw } = useT('common');
  const { assets, loading: catalogLoading } = useCatalog();
  const posts = usePosts(opts.active);

  const assetIndex = useMemo<Indexed[]>(() => assets.map(a => {
    // Category names are data in Spanish: shown translated, searchable in both.
    const tr = raw<unknown>(`categories.${a.cat}`);
    const cat = typeof tr === 'string' ? tr : a.cat;
    return {
      title: normalize(a.name),
      hay: normalize([a.name, a.location, a.company, a.cat, cat, a.country].join(' ')),
      result: { id: `asset-${a.id}`, kind: 'asset', title: a.name, subtitle: [cat, a.location].filter(Boolean).join(' · '), href: pathFor('detalle', { id: a.id }), image: a.img },
    };
  }), [assets, raw]);

  const postIndex = useMemo<Indexed[]>(() => posts.map(p => ({
    title: normalize(p.title),
    hay: normalize([p.title, p.category, p.excerpt].join(' ')),
    result: { id: `post-${p.slug}`, kind: 'post', title: p.title, subtitle: p.category, href: pathFor('articulo', { slug: p.slug }) },
  })), [posts]);

  const sectionIndex = useMemo<Indexed[]>(() => SECTIONS.filter(s => opts.isAdmin || !s.adminOnly).map(s => {
    const title = t(`search.sections.${s.id}.title`);
    const subtitle = t(`search.sections.${s.id}.subtitle`);
    return {
      title: normalize(title),
      hay: normalize([title, subtitle, s.keywords].join(' ')),
      result: { id: `section-${s.id}`, kind: 'section', title, subtitle, href: 'key' in s ? pathFor(s.key) : s.path },
    };
  }), [opts.isAdmin, t]);

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
      .map(([kind, items]) => ({ kind, label: t(`search.groups.${kind}`), items }));
    return { groups, flat: groups.flatMap(g => g.items), loading: catalogLoading };
  }, [query, assetIndex, postIndex, sectionIndex, catalogLoading, t]);
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
