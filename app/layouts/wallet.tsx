import { Outlet } from 'react-router';
import { AutoConnect, ThirdwebProvider } from 'thirdweb/react';
import { CatalogProvider } from '~/lib/catalog';
import { SessionProvider } from '~/lib/session';
import { client } from '~/lib/thirdweb';

/**
 * Wallet context (thirdweb) for every route that can use a wallet, plus
 * session restore. The landing page sits outside it so its first paint
 * doesn't wait for wallet code.
 */
export default function WalletLayout() {
  return (
    <ThirdwebProvider>
      <AutoConnect client={client} />
      <SessionProvider>
        <CatalogProvider>
          <Outlet />
        </CatalogProvider>
      </SessionProvider>
    </ThirdwebProvider>
  );
}
