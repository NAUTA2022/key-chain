import { Navigate } from 'react-router';
import type { Route } from './+types/keypay';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  seo({ title: 'Key Pay', description: 'Wallet, pagos y checkout de la plataforma KEY CHAIN.', path: '/keypay', noindex: true });

// Key Pay is disabled: payments go through KEYCHAIN's own checkout (/checkout),
// so any old /keypay link (including /keypay/*) lands on the home page instead.
export default function Page() {
  return <Navigate to="/" replace />;
}
