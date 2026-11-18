import type { Route } from './+types/tokenizar';
import Wizard from '~/pages/Wizard';
import { useNav } from '~/lib/navigation';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () => seo({ title: 'Tokenizá tu activo', path: '/tokenizar', noindex: true });

export default function Page() {
  const nav = useNav();
  return <Wizard nav={nav} />;
}
