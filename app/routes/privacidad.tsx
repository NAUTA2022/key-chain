import type { Route } from './+types/privacidad';
import Legal from '~/pages/Legal';
import { PRIVACY } from '~/pages/legal-content';
import { breadcrumbs, seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Política de privacidad',
    description: 'Cómo La 33 trata tus datos personales, de verificación de identidad y de inversión.',
    path: '/privacidad',
    jsonLd: [breadcrumbs([{ name: 'Inicio', path: '/' }, { name: 'Política de privacidad', path: '/privacidad' }])],
  });

export default function PrivacidadRoute() {
  return <Legal title="Política de privacidad" intro="Te contamos qué datos tratamos, para qué, con quién los compartimos y cómo ejercer tus derechos." sections={PRIVACY} />;
}
