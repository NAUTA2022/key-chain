import { useLocation, useSearchParams } from 'react-router';
import type { Route } from './+types/tokenizacion';
import ProductDetail from '~/pages/ProductDetail';
import NotFound from '~/routes/not-found';
import { RWA_ASSETS } from '~/data';
import { apiEnabled } from '~/lib/api/client';
import { useNav, type NavFn, type NavState, type RouteKey } from '~/lib/navigation';
import { breadcrumbs, seo } from '~/lib/seo';
import AssetPlaceholder from '~/features/asset/AssetPlaceholder';
import { useResolvedAsset } from '~/features/asset/api';

function findAsset(id: string | undefined) {
  return RWA_ASSETS.find(a => String(a.id) === id);
}

export const meta: Route.MetaFunction = ({ params }) => {
  const asset = findAsset(params.assetId);
  if (!asset) {
    // With the backend, assets published after the build exist too: a generic title until the page loads.
    if (apiEnabled) {
      return seo({
        title: 'Proyecto tokenizado',
        description: 'Activo real tokenizado en La 33: valuación, precio por token, rendimiento estimado y documentos del proyecto.',
        path: `/tokenizaciones/${encodeURIComponent(params.assetId)}`,
        noindex: true,
      });
    }
    return seo({ title: 'Proyecto no encontrado', path: '/tokenizaciones', noindex: true });
  }
  const path = `/tokenizaciones/${asset.id}`;
  return seo({
    title: `${asset.name}, ${asset.location}: activo tokenizado`,
    description: `${asset.desc} Precio por token: US$${asset.tokenPrice}. Rendimiento anual estimado: ${asset.apy}%.`,
    path,
    image: asset.img,
    jsonLd: [breadcrumbs([
      { name: 'Inicio', path: '/' },
      { name: 'Tokenizaciones', path: '/tokenizaciones' },
      { name: asset.name, path },
    ])],
  });
};

/** Backend enabled: the asset comes from the catalog / API (by id or slug). */
function LiveAssetRoute({ idOrSlug, nav, from, focusPostId }: { idOrSlug: string; nav: NavFn; from: RouteKey | undefined; focusPostId: string | null }) {
  const { status, asset, dto, reload } = useResolvedAsset(idOrSlug);
  if (asset) return <ProductDetail key={asset.id} nav={nav} asset={asset} apiAsset={dto} fromRoute={from} focusPostId={focusPostId} />;
  if (status === 'notfound') return <NotFound />;
  return <AssetPlaceholder state={status === 'error' ? 'error' : 'loading'} nav={nav} onRetry={reload} />;
}

export default function TokenizacionRoute({ params }: Route.ComponentProps) {
  const nav = useNav();
  const location = useLocation();
  const from = (location.state as NavState | null)?.from ?? undefined;
  // `?publicacion=<postId>` (links from the global Feed / company profiles): open the Feed tab on that post.
  const [search] = useSearchParams();
  const focusPostId = search.get('publicacion') || null;
  if (apiEnabled) return <LiveAssetRoute idOrSlug={params.assetId} nav={nav} from={from} focusPostId={focusPostId} />;
  const asset = findAsset(params.assetId);
  if (!asset) return <NotFound />;
  return <ProductDetail key={asset.id} nav={nav} asset={asset} fromRoute={from} focusPostId={focusPostId} />;
}
