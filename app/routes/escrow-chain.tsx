import type { Route } from './+types/escrow-chain';
import EscrowChain from '~/features/escrow-chain/EscrowChain';
import { useNav } from '~/lib/navigation';
import type { RouteHandle } from '~/root';
import { seo } from '~/lib/seo';
import { productAppJsonLd } from '~/lib/structured-data';

export const handle: RouteHandle = { theme: 'dark' };

const DESCRIPTION = 'Gestiona importaciones y exportaciones con escrow on-chain: fondos protegidos hasta que se cumplen las condiciones de la operación.';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Escrow Chain: importaciones y exportaciones on-chain',
    description: DESCRIPTION,
    path: '/escrow-chain',
    jsonLd: [productAppJsonLd({ name: 'Escrow Chain', path: '/escrow-chain', description: DESCRIPTION, category: 'FinanceApplication' })],
  });

export default function Page() {
  const nav = useNav();
  return <div style={{ minHeight: '100vh', background: 'var(--bg)' }}><EscrowChain nav={nav} /></div>;
}
