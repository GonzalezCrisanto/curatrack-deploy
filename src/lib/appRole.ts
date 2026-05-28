import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'sponsor' | 'professional';

/**
 * Single ACL source of truth:
 * resolve effective app role exclusively from `user_roles`.
 *
 * Deterministic rule for inconsistent legacy data (multiple rows per user):
 * admin > sponsor > professional
 */
export function resolveAppRoleFromRows(roles: string[]): AppRole {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('sponsor')) return 'sponsor';
  return 'professional';
}

export async function getUserAppRole(userId: string): Promise<AppRole> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const roles = (data ?? []).map((r: any) => r.role as string);
  return resolveAppRoleFromRows(roles);
}

