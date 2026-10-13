import { useAuth } from '@/providers/AuthProvider';

/**
 * Renders children only when the current admin holds the permission(s).
 * UX convenience only — the API enforces every permission server-side.
 */
export function PermissionGate({ permission, anyOf, fallback = null, children }) {
  const { can, canAny } = useAuth();
  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : true;
  return allowed ? children : fallback;
}
