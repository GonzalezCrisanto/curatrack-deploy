import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useAppRole, AppRole } from '@/hooks/useAppRole';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  allow: AppRole[];
  children: ReactNode;
}

/** Redirects to login if not signed in, or to the role's home if not allowed. */
export function RoleGuard({ allow, children }: Props) {
  const { authReady, isLoggedIn } = useApp();
  const { role, ready } = useAppRole();
  const location = useLocation();

  if (!authReady || (isLoggedIn && !ready)) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && !allow.includes(role)) {
    const home = role === 'sponsor' ? '/sponsor' : '/dashboard';
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}

export function homeForRole(role: AppRole | null): string {
  if (role === 'sponsor') return '/sponsor';
  return '/dashboard';
}
