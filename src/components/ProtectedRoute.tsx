import { ReactNode, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { PermissionSection } from '@/config/permissions';
import { toast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  requiredPermission?: PermissionSection;
  requiredAnyOf?: PermissionSection[];
  children: ReactNode;
}

function homeForRole(role: 'CLINICIAN' | 'SPONSOR' | 'ADMIN' | null): string {
  if (role === 'SPONSOR') return '/panel-sponsor';
  if (role === 'ADMIN') return '/admin/products';
  return '/dashboard';
}

export function ProtectedRoute({ requiredPermission, requiredAnyOf, children }: ProtectedRouteProps) {
  const { authReady, isLoggedIn, currentUser } = useApp();
  const { role, ready, can } = usePermissions();
  const location = useLocation();
  const warnedRef = useRef(false);

  if (!authReady || (isLoggedIn && !ready)) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const hasAccess = (() => {
    if (requiredAnyOf && requiredAnyOf.length > 0) return requiredAnyOf.some((perm) => can(perm));
    if (requiredPermission) return can(requiredPermission);
    return true;
  })();

  if (!hasAccess) {
    if (!warnedRef.current) {
      warnedRef.current = true;
      const timestamp = new Date().toISOString();
      toast({
        title: 'Acceso restringido',
        description: 'No tenés permisos para acceder a esta sección',
        duration: 4000,
        className: 'border-warning/40 bg-warning/10 text-warning',
      });
      console.warn('[AUDIT] Intento de acceso no autorizado', {
        userId: currentUser?.id ?? null,
        role,
        attemptedPath: location.pathname,
        timestamp,
      });
    }
    return <Navigate to={homeForRole(role)} replace />;
  }

  return <>{children}</>;
}

