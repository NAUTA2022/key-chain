import { Navigate, Outlet, useLocation } from 'react-router';
import { isHiddenPath } from '~/lib/hiddenSections';

/** Wraps the routes of switched-off sections (see app/lib/hiddenSections.ts): they redirect instead of rendering. */
export default function SectionGate() {
  const { pathname } = useLocation();
  if (isHiddenPath(pathname)) return <Navigate to="/tokenizaciones" replace />;
  return <Outlet />;
}
