import { Navigate, Outlet } from 'react-router';
import { usePreferences } from '~/lib/preferences';
import { useSession } from '~/lib/session';

/**
 * Admin-only pages. The role comes from the authenticated backend session;
 * without a backend nobody is admin (the role is never granted client-side).
 */
export default function RequireAdmin() {
  const session = useSession();
  const { role } = usePreferences();
  // Wait for the session to be restored before deciding (a cold load of /admin must not bounce).
  if (session.status === 'loading') return null;
  const effectiveRole = session.status === 'disabled' ? role : session.user?.role;
  if (effectiveRole !== 'admin') return <Navigate to="/panel" replace />;
  return <Outlet />;
}
