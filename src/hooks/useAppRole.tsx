import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getUserAppRole, type AppRole } from '@/lib/appRole';

export type { AppRole } from '@/lib/appRole';

/**
 * Canonical role lookup from `user_roles` (NOT profiles.role, which is the
 * clinical specialty: enfermero/medico/admin). Falls back to 'professional'.
 */
export function useAppRole(): { role: AppRole | null; ready: boolean } {
  const { currentUser, authReady } = useApp();
  const [role, setRole] = useState<AppRole | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!currentUser) {
      setRole(null);
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      setReady(false);
      const resolved = await getUserAppRole(currentUser.id);
      if (cancelled) return;
      setRole(resolved);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [currentUser, authReady]);

  return { role, ready };
}
