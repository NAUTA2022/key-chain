import { useCallback, useMemo } from 'react';
import { z } from 'zod';
import { api, apiEnabled, apiUrl, authHeaders } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { mediaUrl, toCatalogAsset, useCatalog, type ApiAssetDto, type CatalogAsset } from '~/lib/catalog';
import { useSession } from '~/lib/session';
import { useApiData } from '~/features/portfolio/useApiData';

// Live data of an asset page: the asset itself (catalog or API), its feed,
// its investor documents and the platform's public settings (fee, pauses).

type Json<P extends keyof paths> = paths[P] extends { get: { responses: { 200: { content: { 'application/json': infer T } } } } } ? T : never;

export type PublicSettings = Json<'/v1/settings/public'>;
export type AssetDocument = Json<'/v1/assets/{idOrSlug}/documents'>[number];

/** Viewer id once the session settled ('anon' when signed out); null while it loads. */
function useViewer(): string | null {
  const { status, user } = useSession();
  if (status === 'loading') return null;
  return user?.id ?? 'anon';
}

export type ResolvedAsset = {
  status: 'loading' | 'ready' | 'notfound' | 'error';
  asset: CatalogAsset | null;
  /** Full API view (contracts, distribution schedule); null until it loads. */
  dto: ApiAssetDto | null;
  reload: () => void;
};

/**
 * An asset by id or slug: shown from the catalog right away, then completed
 * with GET /v1/assets/:idOrSlug (which also finds assets published after the
 * build). Not found only when the API answers 404.
 */
export function useResolvedAsset(idOrSlug: string | undefined): ResolvedAsset {
  const catalog = useCatalog();
  const viewer = useViewer();
  const fromCatalog = idOrSlug ? catalog.assets.find(a => String(a.id) === idOrSlug || a.slug === idOrSlug) : undefined;
  const res = useApiData<{ dto: ApiAssetDto | null; notFound: boolean }>(
    apiEnabled && idOrSlug && viewer ? `asset:${idOrSlug}:${viewer}` : null,
    async () => {
      if (!idOrSlug) return null;
      const r = await api.GET('/v1/assets/{idOrSlug}', { params: { path: { idOrSlug } } });
      if (r.data) return { dto: r.data, notFound: false };
      return r.response.status === 404 ? { dto: null, notFound: true } : null;
    },
  );
  const dto = res.data?.dto ?? null;
  const fromApi = useMemo(() => (dto ? toCatalogAsset(dto) : null), [dto]);
  const asset = fromApi ?? fromCatalog ?? null;
  let status: ResolvedAsset['status'] = 'ready';
  if (!asset) {
    if (res.loading || catalog.loading || viewer === null) status = 'loading';
    else status = res.data?.notFound ? 'notfound' : 'error';
  }
  return { status, asset, dto, reload: res.reload };
}

// One /settings/public request per page load.
let settingsRequest: Promise<PublicSettings | null> | null = null;
function loadSettings(): Promise<PublicSettings | null> {
  settingsRequest ??= api.GET('/v1/settings/public').then(r => r.data ?? null);
  return settingsRequest.then(s => {
    if (!s) settingsRequest = null;
    return s;
  });
}

export function usePublicSettings() {
  const { reload: refetch, ...rest } = useApiData<PublicSettings>(apiEnabled ? 'settings:public' : null, loadSettings);
  // A reload must skip the shared cache (e.g. after an "investments paused" error).
  const reload = useCallback(() => {
    settingsRequest = null;
    refetch();
  }, [refetch]);
  return { ...rest, reload };
}

// The updates endpoints are not typed in the OpenAPI document: validate at runtime.
const updateSchema = z.object({
  id: z.string(),
  body: z.string(),
  imageUrl: z.string().nullable(),
  milestone: z.boolean(),
  likes: z.number(),
  likedByMe: z.boolean(),
  createdAt: z.string(),
});
const likeSchema = z.object({ liked: z.boolean(), likes: z.number() });

export type AssetUpdate = z.infer<typeof updateSchema>;

/** Only API media or absolute http(s) URLs are rendered as images. */
export function safeImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/v1/')) return mediaUrl(url);
  return /^https?:\/\//i.test(url) ? url : null;
}

export function useAssetUpdates(assetId: number | null) {
  const viewer = useViewer();
  return useApiData<AssetUpdate[]>(apiEnabled && assetId !== null && viewer ? `updates:${assetId}:${viewer}` : null, async () => {
    if (assetId === null) return null;
    const r = await api.GET('/v1/assets/{id}/updates', { params: { path: { id: assetId } } });
    const parsed = z.array(updateSchema).safeParse(r.data);
    return parsed.success ? parsed.data : null;
  });
}

export async function toggleUpdateLike(updateId: string): Promise<{ liked: boolean; likes: number } | null> {
  const r = await api.POST('/v1/assets/updates/{updateId}/like', { params: { path: { updateId } } });
  const parsed = likeSchema.safeParse(r.data);
  return parsed.success ? parsed.data : null;
}

/** Publishes an issuer update; returns an error message or null on success. */
export async function publishUpdate(assetId: number, input: { body: string; milestone: boolean; imageUrl: string | null }): Promise<string | null> {
  const body = input.body.trim();
  if (!body) return 'Escribí la actualización antes de publicarla.';
  if (body.length > 2000) return 'La actualización puede tener hasta 2000 caracteres.';
  try {
    const r = await api.POST('/v1/assets/{id}/updates', {
      params: { path: { id: assetId } },
      body: { body, milestone: input.milestone, ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}) },
    });
    if (r.response.ok) return null;
    switch (r.response.status) {
      case 401: return 'Iniciá sesión para publicar.';
      case 403: return 'Solo el emisor del proyecto puede publicar actualizaciones.';
      case 409: return 'El feed se habilita cuando el proyecto está operativo o financiado.';
      case 429: return 'Publicaste muchas actualizaciones seguidas. Probá de nuevo más tarde.';
      default: return 'No se pudo publicar la actualización.';
    }
  } catch {
    return 'No se pudo contactar al servidor.';
  }
}

/** Investor documents (signed-in users only). */
export function useAssetDocuments(idOrSlug: string | null) {
  const { status, user } = useSession();
  return useApiData<AssetDocument[]>(status === 'authenticated' && user && idOrSlug ? `documents:${idOrSlug}:${user.id}` : null, async () => {
    if (!idOrSlug) return null;
    return (await api.GET('/v1/assets/{idOrSlug}/documents', { params: { path: { idOrSlug } } })).data ?? null;
  });
}

/** Downloads a document with the session credentials (files are not public). */
export async function downloadDocument(doc: AssetDocument): Promise<void> {
  // Credentials only ever go to the API's own file endpoint.
  if (!/^\/v1\/files\/[\w-]+$/.test(doc.url)) throw new Error('Documento no disponible.');
  const res = await fetch(apiUrl(doc.url), { credentials: 'include', headers: authHeaders() });
  if (!res.ok) throw new Error(res.status === 401 ? 'Tu sesión expiró. Volvé a iniciar sesión.' : 'No se pudo descargar el documento.');
  const href = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = href;
  link.download = doc.filename || `${doc.title}.pdf`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
