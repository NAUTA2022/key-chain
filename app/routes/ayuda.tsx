import type { Route } from './+types/ayuda';
import HelpCenter, { FAQS } from '~/pages/HelpCenter';
import { breadcrumbs, seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Centro de ayuda y preguntas frecuentes',
    description: 'Respuestas sobre tokenización de activos, rendimientos en USDC, venta de tokens, verificación KYC, inversión mínima, seguros y token de la plataforma.',
    path: '/ayuda',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
      breadcrumbs([{ name: 'Inicio', path: '/' }, { name: 'Centro de ayuda', path: '/ayuda' }]),
    ],
  });

export default function AyudaRoute() {
  return <HelpCenter />;
}
