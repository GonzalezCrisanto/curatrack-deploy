import { useMemo } from 'react';
import { LEGACY_ROLE_TO_SYSTEM_ROLE, ROLE_PERMISSIONS, type PermissionSection, type SystemRole } from '@/config/permissions';
import { useAppRole } from '@/hooks/useAppRole';

export function usePermissions() {
  const { role: appRole, ready } = useAppRole();

  const role = useMemo<SystemRole | null>(() => {
    if (!appRole) return null;
    return LEGACY_ROLE_TO_SYSTEM_ROLE[appRole] ?? null;
  }, [appRole]);

  const permissions = useMemo<readonly PermissionSection[]>(() => {
    if (!role) return [];
    return ROLE_PERMISSIONS[role] ?? [];
  }, [role]);

  const can = (section: string) => {
    if (!role) return false;
    return permissions.includes(section as PermissionSection);
  };

  return {
    role,
    ready,
    can,
    isClinicalRole: role === 'CLINICIAN',
    isSponsorRole: role === 'SPONSOR',
    isAdminRole: role === 'ADMIN',
  };
}

