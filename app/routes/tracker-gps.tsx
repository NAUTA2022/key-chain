import type { Route } from './+types/tracker-gps';
import AssetTracker from '~/features/tracker-gps/AssetTracker';
import { useNav } from '~/lib/navigation';
import type { RouteHandle } from '~/root';
import { seo } from '~/lib/seo';
import { productAppJsonLd } from '~/lib/structured-data';

export const handle: RouteHandle = { theme: 'dark' };

const DESCRIPTION = 'Seguí en tiempo real la ubicación y el estado de tus activos tokenizados con rastreo GPS.';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Tracker GPS: seguimiento de activos en tiempo real',
    description: DESCRIPTION,
    path: '/tracker-gps',
    jsonLd: [productAppJsonLd({ name: 'Tracker GPS', path: '/tracker-gps', description: DESCRIPTION, category: 'BusinessApplication' })],
  });

export default function Page() {
  const nav = useNav();
  return <div style={{ minHeight: '100vh', background: 'var(--bg)' }}><AssetTracker nav={nav} /></div>;
}
