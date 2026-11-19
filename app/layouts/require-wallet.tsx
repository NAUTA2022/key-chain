import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useActiveAccount, useActiveWalletConnectionStatus } from 'thirdweb/react';
import { ConnectButton } from '~/components/ConnectButton';
import { PBtn, PCard } from '~/components/ui';
import { useT } from '~/i18n/useT';
import { polygon } from 'thirdweb/chains';
import { appChain } from '~/lib/onchain';
import { client } from '~/lib/thirdweb';
import Onboarding from '~/features/onboarding/Onboarding';
import { useHydrated } from '~/hooks/useHydrated';
import { DEV_LOGIN, useDevSession } from '~/lib/devSession';
import { useSession } from '~/lib/session';

/**
 * Gate for private pages. With the backend enabled it requires a signed-in
 * session (thirdweb SIWE) AND the same wallet connected (SessionProvider closes
 * the session when the wallet goes away); otherwise a connected wallet. While
 * either is still being restored it renders nothing, so returning users are not bounced.
 * First login (live mode): the onboarding replaces the page until the user finishes it.
 * Demo mode in development: an "Entrar dev" session counts as a connected wallet.
 */
export default function RequireWallet() {
  const session = useSession();
  const walletStatus = useActiveWalletConnectionStatus();
  const account = useActiveAccount();
  const devSession = useDevSession();
  const hydrated = useHydrated();
  const location = useLocation();
  // Keeps the flow open after the profile is saved (user.onboarded flips to true) until the last step.
  const [flowUserId, setFlowUserId] = useState<string | null>(null);
  // A wallet that never comes back (locked extension, closed mobile wallet) must not leave a blank page.
  const waitingWallet = session.status === 'authenticated' && walletStatus !== 'connected';
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    if (!waitingWallet) return;
    const t = setTimeout(() => setStalled(true), 5000);
    return () => { clearTimeout(t); setStalled(false); };
  }, [waitingWallet]);
  const redirect = <Navigate to="/ingresar" replace state={{ redirectTo: `${location.pathname}${location.search}` }} />;

  if (session.status !== 'disabled') {
    if (session.status === 'anonymous') return redirect;
    if (session.status !== 'authenticated') return null;
    if (walletStatus !== 'connected') return stalled ? <ReconnectWallet onLogout={() => void session.logout()} /> : null;
    // A different account than the session's: render nothing (SessionProvider ends that session).
    if (!account || account.address.toLowerCase() !== session.user?.walletAddress) return null;
    const user = session.user;
    if (user && (!user.onboarded || flowUserId === user.id)) {
      return <Onboarding key={user.id} user={user} onStarted={() => setFlowUserId(user.id)} onFinished={() => setFlowUserId(null)} />;
    }
    return <Outlet />;
  }
  if (walletStatus === 'connected' || devSession) return <Outlet />;
  // The dev session is read from storage after hydration: wait for it before bouncing to the login.
  if (DEV_LOGIN && !hydrated) return null;
  return walletStatus === 'disconnected' ? redirect : null;
}

/** Shown when the session is alive but its wallet does not reconnect on its own. */
function ReconnectWallet({ onLogout }: { onLogout: () => void }) {
  const { t } = useT('common');
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 16px' }}>
      <PCard style={{ padding: '28px 26px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 20, color: 'var(--text)', margin: '0 0 8px' }}>{t('wallet.reconnectTitle')}</h1>
        <p style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.55, margin: '0 0 20px' }}>
          {t('wallet.reconnectText')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <ConnectButton client={client} chain={appChain ?? polygon} connectButton={{ label: t('wallet.connect') }} />
          <PBtn variant="ghost" small onClick={onLogout}>{t('nav.logout')}</PBtn>
        </div>
      </PCard>
    </div>
  );
}
