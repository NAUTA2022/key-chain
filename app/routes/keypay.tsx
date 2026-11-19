import { Navigate } from 'react-router';
import type { Route } from './+types/keypay';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  seo({ title: 'Brikme Pay', description: 'Wallet, pagos y checkout de la plataforma Brikme.', path: '/keypay', noindex: true });

// Brikme Pay is disabled: payments go through Brikme's own checkout (/checkout),
// so any old /keypay link (including /keypay/*) lands on the home page instead.
export default function Page() {
  return <Navigate to="/" replace />;
}
