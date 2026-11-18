import type { Route } from './+types/demo-en-vivo';
import DemoFlow from '~/features/demo-flow/DemoFlow';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () => seo({ title: 'Demo en vivo: Villa Mirador', path: '/demo-en-vivo', noindex: true });

export default function Page() {
  return <DemoFlow />;
}
