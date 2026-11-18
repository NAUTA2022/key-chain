import { useMemo, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router';
import type { Route } from './+types/checkout';
import Checkout from '~/pages/Checkout';
import { useCatalog } from '~/lib/catalog';
import { investmentOrder, loadOrder } from '~/lib/checkout';
import { useNav } from '~/lib/navigation';
import { useSession } from '~/lib/session';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () => seo({ title: 'Checkout', path: '/checkout', noindex: true });

// Stored orders never change once saved: nothing to subscribe to.
const noSubscription = () => () => undefined;

export default function Page() {
  const nav = useNav();
  const [params] = useSearchParams();
  const live = useSession().status !== 'disabled';
  const { byId } = useCatalog();
  // `?orden=<id>`: the order goCheckout kept (sessionStorage survives a reload).
  const orderId = params.get('orden');
  const stored = useSyncExternalStore(noSubscription, () => loadOrder(orderId), () => null);
  // `?activo=<id>&cantidad=<n>`: an investment link (also the fallback when the stored order is gone).
  const asset = byId(params.get('activo') ?? undefined);
  const qty = Math.max(1, Math.floor(Number(params.get('cantidad')) || 1));
  const linked = useMemo(() => (asset ? investmentOrder(asset, qty, live) : null), [asset, qty, live]);
  const order = stored ?? linked;
  // A new order starts the checkout from its first step.
  return <Checkout key={orderId ?? `${asset?.id ?? ''}:${qty}`} nav={nav} order={order} />;
}
