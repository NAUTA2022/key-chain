import type { Route } from './+types/key-jobs';
import KeyJobs from '~/features/key-jobs/KeyJobs';
import type { RouteHandle } from '~/root';
import { seo } from '~/lib/seo';
import { productAppJsonLd } from '~/lib/structured-data';

export const handle: RouteHandle = { theme: 'light' };

const DESCRIPTION = 'Encontrá empleos y talento en el ecosistema de tokenización: publicá búsquedas, postulate y gestioná tus oportunidades.';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Key Jobs: empleos y talento tokenizado',
    description: DESCRIPTION,
    path: '/key-jobs',
    jsonLd: [productAppJsonLd({ name: 'Key Jobs', path: '/key-jobs', description: DESCRIPTION, category: 'BusinessApplication' })],
  });

export default function Page() {
  return <KeyJobs />;
}
