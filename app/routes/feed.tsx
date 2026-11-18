import type { Route } from './+types/feed';
import GlobalFeed from '~/pages/GlobalFeed';
import { useNav } from '~/lib/navigation';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () => seo({ title: 'Feed', path: '/feed', noindex: true });

export default function Page() {
  const nav = useNav();
  return <GlobalFeed nav={nav} />;
}
