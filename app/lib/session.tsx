import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { LoginPayload, VerifyLoginPayloadParams } from 'thirdweb/auth';
import { useActiveAccount, useActiveWalletConnectionStatus, useIsAutoConnecting } from 'thirdweb/react';
import { api, apiEnabled, setBearer } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';

export type SessionUser = paths['/v1/auth/me']['get']['responses'][200]['content']['application/json'];
export type SessionStatus = 'disabled' | 'loading' | 'authenticated' | 'anonymous';

/** Shape thirdweb's ConnectButton expects in its `auth` prop (SIWE). */
export type ConnectAuth = {
  getLoginPayload: (params: { address: string; chainId: number }) => Promise<LoginPayload>;
  doLogin: (params: VerifyLoginPayloadParams) => Promise<void>;
  isLoggedIn: (address: string) => Promise<boolean>;
  doLogout: () => Promise<void>;
};

type SessionValue = {
  status: SessionStatus;
  user: SessionUser | null;
  /** Pass to every ConnectButton; undefined when the backend is disabled. */
  connectAuth: ConnectAuth | undefined;
  logout: () => Promise<void>;
  /** Re-reads /auth/me (e.g. after a KYC submission changes the user's status). */
  refresh: () => Promise<void>;
  /**
   * Role of the last session seen in this browser, used only to draw the menu while
   * /auth/me loads (no flicker on reload). Never use it for access decisions.
   */
  roleHint: SessionUser['role'] | null;
};

const SessionContext = createContext<SessionValue | null>(null);

const ROLE_HINT_KEY = 'kc.role-hint';

function readRoleHint(): SessionUser['role'] | null {
  try {
    const v = window.localStorage.getItem(ROLE_HINT_KEY);
    return v === 'admin' || v === 'investor' ? v : null;
  } catch {
    return null;
  }
}

// Tiny external store so every reader sees the hint on the first client render.
const roleHintListeners = new Set<() => void>();
let roleHintCache: SessionUser['role'] | null | undefined;
const getRoleHint = () => (roleHintCache === undefined ? (roleHintCache = readRoleHint()) : roleHintCache);
const subscribeRoleHint = (onChange: () => void) => {
  roleHintListeners.add(onChange);
  return () => void roleHintListeners.delete(onChange);
};

function writeRoleHint(role: SessionUser['role'] | null) {
  if (getRoleHint() === role) return;
  roleHintCache = role;
  try {
    if (role) window.localStorage.setItem(ROLE_HINT_KEY, role);
    else window.localStorage.removeItem(ROLE_HINT_KEY);
  } catch {
    // Storage blocked (private mode): the menu just waits for /auth/me.
  }
  roleHintListeners.forEach(l => l());
}

async function fetchMe(): Promise<SessionUser | null> {
  const { data } = await api.GET('/v1/auth/me');
  return data ?? null;
}

/**
 * Backend session (thirdweb SIWE → HttpOnly cookie). With VITE_API_URL unset the
 * status is "disabled" and the app keeps its wallet-only behaviour.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>(apiEnabled ? 'loading' : 'disabled');
  const storedHint = useSyncExternalStore(subscribeRoleHint, getRoleHint, () => null);
  const roleHint = apiEnabled ? storedHint : null;
  // One /auth/me request per page load, shared by every ConnectButton.
  const meRequest = useRef<Promise<SessionUser | null> | null>(null);
  const loadMe = useCallback(() => (meRequest.current ??= fetchMe().catch(() => null)), []);

  useEffect(() => {
    if (status === 'authenticated' && user) writeRoleHint(user.role);
    else if (status === 'anonymous') writeRoleHint(null);
  }, [status, user]);

  useEffect(() => {
    if (!apiEnabled) return;
    let alive = true;
    void loadMe().then(me => {
      if (!alive) return;
      setUser(me);
      setStatus(me ? 'authenticated' : 'anonymous');
    });
    return () => {
      alive = false;
    };
  }, [loadMe]);

  const logout = useCallback(async () => {
    if (apiEnabled) await api.POST('/v1/auth/logout').catch(() => undefined);
    setBearer(null);
    meRequest.current = Promise.resolve(null);
    setUser(null);
    setStatus(apiEnabled ? 'anonymous' : 'disabled');
  }, []);

  const refresh = useCallback(async () => {
    if (!apiEnabled) return;
    meRequest.current = fetchMe().catch(() => null);
    const me = await meRequest.current;
    setUser(me);
    setStatus(me ? 'authenticated' : 'anonymous');
  }, []);

  const connectAuth = useMemo<ConnectAuth | undefined>(() => {
    if (!apiEnabled) return undefined;
    return {
      async getLoginPayload({ address, chainId }) {
        const { data, error } = await api.GET('/v1/auth/payload', { params: { query: { address, chainId } } });
        if (error || !data) throw new Error('No se pudo iniciar la firma de acceso.');
        return data as LoginPayload;
      },
      async doLogin(params) {
        const { data, error } = await api.POST('/v1/auth/login', { body: params });
        if (error || !data) throw new Error('La firma no es válida.');
        setBearer(data.token);
        meRequest.current = Promise.resolve(data.user);
        setUser(data.user);
        setStatus('authenticated');
      },
      async isLoggedIn(address) {
        const me = await loadMe();
        return Boolean(me && me.walletAddress === address.toLowerCase());
      },
      doLogout: logout,
    };
  }, [logout, loadMe]);

  // The session belongs to one wallet: if that wallet disconnects (extension, lock, failed
  // reconnect) or the user switches to another account, the server session is closed too.
  const account = useActiveAccount();
  const walletStatus = useActiveWalletConnectionStatus();
  const autoConnecting = useIsAutoConnecting();
  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    const switched = Boolean(account && account.address.toLowerCase() !== user.walletAddress);
    const gone = walletStatus === 'disconnected' && !autoConnecting;
    if (!switched && !gone) return;
    // A wallet switch ends the session at once; a disconnect is debounced because thirdweb
    // passes through "disconnected" briefly while it restores a wallet.
    const t = setTimeout(() => void logout(), switched ? 0 : 1500);
    return () => clearTimeout(t);
  }, [status, user, account, walletStatus, autoConnecting, logout]);

  // Coming back to the tab re-reads the session (role, KYC and onboarding may have changed meanwhile).
  const lastRefresh = useRef(0);
  useEffect(() => {
    if (status !== 'authenticated') return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefresh.current < 30_000) return;
      lastRefresh.current = Date.now();
      void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [status, refresh]);

  const value = useMemo<SessionValue>(
    () => ({ status, user, connectAuth, logout, refresh, roleHint }),
    [status, user, connectAuth, logout, refresh, roleHint],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
