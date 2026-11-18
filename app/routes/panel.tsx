import type { Route } from './+types/panel';
import Dashboard from '~/pages/Dashboard';
import { useNav } from '~/lib/navigation';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () => seo({ title: 'Panel', path: '/panel', noindex: true });

export default function Page() {
  const nav = useNav();
  return <Dashboard nav={nav} />;
}
