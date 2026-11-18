import type { Route } from './+types/admin';
import Admin from '~/pages/Admin';
import { useNav } from '~/lib/navigation';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () => seo({ title: 'Panel de administración', path: '/admin', noindex: true });

export default function Page() {
  const nav = useNav();
  return <Admin nav={nav} />;
}
