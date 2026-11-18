import type { Route } from './+types/pertenencias';
import Holdings from '~/pages/Holdings';
import { useNav } from '~/lib/navigation';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () => seo({ title: 'Mis pertenencias', path: '/pertenencias', noindex: true });

export default function Page() {
  const nav = useNav();
  return <Holdings nav={nav} />;
}
