import { useLocation } from 'react-router';
import type { Route } from './+types/empresa';
import CompanyProfile from '~/pages/CompanyProfile';
import { COMPANY_BASE, useNav, type NavState } from '~/lib/navigation';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = ({ params }) =>
  seo({ title: 'Perfil de empresa', path: `${COMPANY_BASE}/${encodeURIComponent(params.slug)}`, noindex: true });

export default function Page({ params }: Route.ComponentProps) {
  const nav = useNav();
  const location = useLocation();
  const from = (location.state as NavState | null)?.from ?? undefined;
  // Keyed by slug: moving between two companies remounts the profile with fresh state.
  return <CompanyProfile key={params.slug} nav={nav} slug={params.slug} fromRoute={from} />;
}
