import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useActiveWalletConnectionStatus } from 'thirdweb/react';
import type { Route } from './+types/login';
import Login from '~/pages/Login';
import { HOME_PATH } from '~/lib/navigation';
import { useSession } from '~/lib/session';
import { seo } from '~/lib/seo';
import { isInternalPath } from '~/lib/links';

export const meta: Route.MetaFunction = () =>
  seo({ title: 'Iniciar sesión', description: 'Entrá a KEY CHAIN: conectá tu wallet para invertir en activos reales tokenizados.', path: '/ingresar', noindex: true });

type LoginState = { redirectTo?: string } | null;

function safeRedirect(target: string | undefined): string {
  // Only same-site paths: never follow an absolute or protocol-relative URL.
  return target && isInternalPath(target) ? target : HOME_PATH;
}

export default function LoginRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const walletStatus = useActiveWalletConnectionStatus();
  const session = useSession();
  const target = safeRedirect((location.state as LoginState)?.redirectTo);
  // With the backend, being "in" means a signed SIWE session, not just a connected wallet.
  const signedIn = session.status === 'disabled' ? walletStatus === 'connected' : session.status === 'authenticated';

  useEffect(() => {
    if (signedIn) navigate(target, { replace: true });
  }, [signedIn, target, navigate]);

  return (
    <Login
      onSuccess={() => {
        if (session.status === 'disabled') navigate(target, { replace: true });
      }}
      onBack={() => navigate('/')}
    />
  );
}
