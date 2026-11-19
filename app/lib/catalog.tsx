import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { RWA_ASSETS, type AssetCategory, type AssetStage, type RwaAsset } from '~/data';
import { API_URL, api, apiEnabled } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { useDataText } from '~/i18n/data';

// The asset catalog. With the backend enabled it comes from GET /v1/assets (the
// source of truth, including assets created by admins); otherwise the demo data.
// Pages keep consuming the RwaAsset shape they were designed for.

export type ApiAssetDto = paths['/v1/assets/{idOrSlug}']['get']['responses'][200]['content']['application/json'];

/** RwaAsset + the live fields only the API knows. */
export type CatalogAsset = RwaAsset & {
  slug: string;
  pool: ApiAssetDto['pool'] | null;
  live: boolean;
};

const CATEGORY: Record<ApiAssetDto['category'], AssetCategory> = {
  autos: 'Autos', campos: 'Campos', drones: 'Drones', inmuebles: 'Inmuebles', edificios: 'Edificios',
};
const STAGE: Record<ApiAssetDto['stage'], AssetStage> = { recaudacion: 'Recaudación', operativo: 'Operativo' };
const FALLBACK_IMAGE = '/images/assets/photo-1560958089-b8a1929cea89.webp';

/** Absolute URL for media served by the API (uploads live under /v1/files/…); site assets stay relative. */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return FALLBACK_IMAGE;
  return url.startsWith('/v1/') ? `${API_URL}${url}` : url;
}

export function toCatalogAsset(a: ApiAssetDto): CatalogAsset {
  const images = a.images.length ? a.images.map(mediaUrl) : [FALLBACK_IMAGE];
  return {
    id: a.id,
    slug: a.slug,
    cat: CATEGORY[a.category],
    country: a.country,
    company: a.issuer.name,
    issuer: a.issuer.kind,
    name: a.name,
    location: a.location,
    images,
    img: images[0] ?? FALLBACK_IMAGE,
    valuation: a.valuation,
    tokenPrice: a.tokenPrice,
    totalTokens: a.totalTokens,
    sold: a.soldPercent,
    apy: a.apy,
    stage: STAGE[a.stage],
    lifespan: a.lifespan,
    contract: a.pool?.token ?? a.contractAddress ?? '',
    desc: a.description,
    perf: a.performance,
    feedEnabled: a.feedEnabled,
    isMine: a.isMine,
    pool: a.pool,
    live: true,
  };
}

const demoCatalog: CatalogAsset[] = RWA_ASSETS.map(a => ({ ...a, slug: String(a.id), pool: null, live: false }));

type CatalogValue = {
  assets: CatalogAsset[];
  byId: (id: number | string | undefined) => CatalogAsset | undefined;
  loading: boolean;
  reload: () => void;
};

const CatalogContext = createContext<CatalogValue | null>(null);

async function fetchAll(): Promise<CatalogAsset[]> {
  const out: CatalogAsset[] = [];
  let cursor: number | undefined;
  for (let page = 0; page < 20; page++) {
    const { data } = await api.GET('/v1/assets', { params: { query: { limit: 100, cursor } } });
    if (!data) break;
    out.push(...data.items.map(toCatalogAsset));
    if (data.nextCursor == null) break;
    cursor = Number(data.nextCursor);
  }
  return out;
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ tick: number; assets: CatalogAsset[] } | null>(null);

  useEffect(() => {
    if (!apiEnabled) return;
    let alive = true;
    fetchAll()
      .then(assets => alive && setState({ tick, assets }))
      .catch(() => alive && setState({ tick, assets: [] }));
    return () => {
      alive = false;
    };
  }, [tick]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  const text = useDataText();
  const value = useMemo<CatalogValue>(() => {
    // Until the API answers (and in the prerendered HTML, which crawlers read) the
    // build-time copy of the catalog is shown; it is the same seed the database starts from.
    // Demo assets are shown in the active language; live ones as the API serves them.
    const assets = (apiEnabled ? (state?.assets ?? demoCatalog) : demoCatalog).map(text.asset);
    const index = new Map(assets.map(a => [a.id, a]));
    return {
      assets,
      byId: id => (id === undefined ? undefined : index.get(Number(id))),
      // Only reloads count as loading: the first paint already has the build-time catalog.
      loading: apiEnabled && state !== null && state.tick !== tick,
      reload,
    };
  }, [state, tick, reload, text]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}
