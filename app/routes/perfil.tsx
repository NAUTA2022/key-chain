import type { Route } from './+types/perfil';
import Profile from '~/pages/Profile';
import { useNav } from '~/lib/navigation';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () => seo({ title: 'Perfil', path: '/perfil', noindex: true });

export default function Page() {
  const nav = useNav();
  return <Profile nav={nav} />;
}
