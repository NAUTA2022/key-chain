import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useCatalog } from '~/lib/catalog';
import { useSession } from '~/lib/session';
import { demoSocialSource } from '~/lib/social/demo';
import { createLiveSocialSource } from '~/lib/social/live';
import type {
  FeedFacets, FeedFilters, FeedItem, FeedQuery, FollowState, FollowTarget, SocialSnapshot, SocialSource,
} from '~/lib/social/types';

export { MAX_POST_MEDIA } from '~/lib/social/types';

/** No search, no filters, newest first. */
export const NO_FEED_FILTERS: FeedFilters = { q: '', cat: null, country: null, author: null, media: 'all', following: false, sort: 'recent' };

/**
 * The SocialSource for the current mode: the in-memory demo adapter without an
 * API, otherwise the API adapter (lib/social/live.ts). The live source is
 * rebuilt only when the signed-in user or the catalog changes, so hooks keyed
 * on it don't reload on every render; its change notifications are shared by
 * every instance.
 */
export function useSocialSource(): SocialSource | null {
  const { status, user } = useSession();
  const { assets } = useCatalog();
  const live = useMemo(() => (status === 'disabled' ? null : createLiveSocialSource({ user, assets })), [status, user, assets]);
  return status === 'disabled' ? demoSocialSource : live;
}

const noSubscribe = () => () => undefined;
const noVersion = () => 0;

/** Re-renders when the source reports a change (likes, follows, comments made elsewhere). */
export function useSocialVersion(source: SocialSource | null): number {
  // Sources implement these as plain functions (no `this`), so they can be passed as-is.
  const subscribe = source?.subscribe ?? noSubscribe;
  const getVersion = source?.getVersion ?? noVersion;
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}

export type SocialQueryState<T> = {
  data: T | undefined;
  loading: boolean;
  error: boolean;
  reload: () => void;
};

/**
 * Reads one value from the source. In-memory sources answer synchronously
 * through their snapshot (first frame already has data, like the design
 * branch); async sources load it in an effect. `key` identifies the request:
 * a new key loads again.
 */
export function useSocialQuery<T>(
  source: SocialSource | null,
  key: string,
  peek: (snapshot: SocialSnapshot) => T,
  load: (source: SocialSource) => Promise<T>,
): SocialQueryState<T> {
  const version = useSocialVersion(source);
  const snapshot = source?.snapshot;
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<{ base: string; full: string; data?: T; error: boolean } | null>(null);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });
  const full = `${key}|${version}|${tick}`;

  useEffect(() => {
    if (!source || snapshot) return undefined;
    let alive = true;
    loadRef.current(source).then(
      data => { if (alive) setResult({ base: key, full, data, error: false }); },
      () => { if (alive) setResult(prev => ({ base: key, full, data: prev?.base === key ? prev.data : undefined, error: true })); },
    );
    return () => { alive = false; };
  }, [source, snapshot, key, full]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  if (snapshot) return { data: peek(snapshot), loading: false, error: false, reload };
  if (!source) return { data: undefined, loading: false, error: false, reload };
  const fresh = result?.full === full;
  // While refreshing the same key, keep showing what we had.
  return { data: result?.base === key ? result.data : undefined, loading: !fresh, error: fresh && !!result?.error, reload };
}

export type FeedPageState = {
  items: FeedItem[];
  hasMore: boolean;
  loading: boolean;
  error: boolean;
  facets: FeedFacets | undefined;
};

type LoadedPages = { query: string; full: string; items: FeedItem[]; nextCursor: string | null; facets?: FeedFacets; error: boolean };

/**
 * The first `limit` posts matching `query` (raise `limit` to load more).
 * Async sources are paged with their cursor; in-memory ones answer at once.
 */
export function useFeedPage(source: SocialSource | null, query: FeedQuery, limit: number): FeedPageState {
  const version = useSocialVersion(source);
  const snapshot = source?.snapshot;
  const queryKey = JSON.stringify(query);
  const full = `${queryKey}|${version}`;
  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; });
  const [pages, setPages] = useState<LoadedPages | null>(null);

  useEffect(() => {
    if (!source || snapshot) return undefined;
    const current = pages?.full === full ? pages : null;
    if (current && (current.error || current.nextCursor === null || current.items.length >= limit)) return undefined;
    let alive = true;
    const have = current?.items.length ?? 0;
    source.listFeed(queryRef.current, current?.nextCursor ?? null, limit - have).then(
      page => {
        if (!alive) return;
        setPages(prev => {
          const base = prev?.full === full ? prev : null;
          return {
            query: queryKey, full, items: [...(base?.items ?? []), ...page.items], nextCursor: page.nextCursor,
            facets: page.facets ?? base?.facets, error: false,
          };
        });
      },
      () => {
        if (!alive) return;
        setPages(prev => ({ ...(prev?.full === full ? prev : { items: [], nextCursor: null }), query: queryKey, full, error: true }));
      },
    );
    return () => { alive = false; };
  }, [source, snapshot, queryKey, full, limit, pages]);

  if (snapshot) {
    const page = snapshot.feed(query, null, limit);
    return { items: page.items, hasMore: page.nextCursor !== null, loading: false, error: false, facets: page.facets };
  }
  if (!source) return { items: [], hasMore: false, loading: false, error: false, facets: undefined };
  const current = pages?.full === full ? pages : null;
  // A refresh of the same query (new version) keeps the previous posts on screen.
  const shown = current ?? (pages?.query === queryKey ? pages : null);
  const loading = !current || (!current.error && current.nextCursor !== null && current.items.length < limit);
  return {
    items: shown?.items ?? [],
    hasMore: !!current && current.nextCursor !== null,
    loading,
    error: !!current?.error,
    facets: shown?.facets,
  };
}

/**
 * Follow / unfollow with an optimistic count. `key` identifies the target on
 * screen; `base` is what the source last said. In-memory sources update their
 * own data at once, so the override is dropped when they answer.
 */
export function useFollowToggle(source: SocialSource | null) {
  const [overrides, setOverrides] = useState<Record<string, FollowState>>({});
  const drop = (key: string) => setOverrides(o => Object.fromEntries(Object.entries(o).filter(([k]) => k !== key)));
  const stateOf = (key: string, base: FollowState): FollowState => overrides[key] ?? base;
  const toggle = (key: string, target: FollowTarget, base: FollowState) => {
    if (!source) return;
    const cur = overrides[key] ?? base;
    setOverrides(o => ({ ...o, [key]: { following: !cur.following, followers: Math.max(0, cur.followers + (cur.following ? -1 : 1)) } }));
    (cur.following ? source.unfollow(target) : source.follow(target)).then(
      r => (source.snapshot ? drop(key) : setOverrides(o => ({ ...o, [key]: r }))),
      () => drop(key),
    );
  };
  return { stateOf, toggle };
}
