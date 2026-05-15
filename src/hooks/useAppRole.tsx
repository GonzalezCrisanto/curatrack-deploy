import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';

export type AppRole = 'admin' | 'sponsor' | 'professional';

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
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id);
      if (cancelled) return;
      const roles = (data ?? []).map((r: any) => r.role as string);
      let resolved: AppRole = 'professional';
      if (roles.includes('admin')) resolved = 'admin';
      else if (roles.includes('sponsor')) resolved = 'sponsor';
      setRole(resolved);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [currentUser, authReady]);

  return { role, ready };
}
