import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { PageLoader } from '@/components/ui';
import ForbiddenPage from '@/pages/system/ForbiddenPage';

/** Requires an authenticated admin session; otherwise redirects to /login preserving the target. */
export function ProtectedRoute() {
  const { status, sessionExpired } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search, expired: sessionExpired }} />;
  }
  return <Outlet />;
}

/** Login / password recovery screens: authenticated admins go straight to the dashboard. */
export function GuestRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <PageLoader />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/** Per-route permission guard. `anyOf` passes when at least one permission is held. */
export function RequirePermission({ permission, anyOf, children }) {
  const { can, canAny } = useAuth();
  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : true;
  if (!allowed) return <ForbiddenPage />;
  return children ?? <Outlet />;
}
