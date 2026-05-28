import type { AppRole } from '@/hooks/useAppRole';

export type SystemRole = 'CLINICIAN' | 'SPONSOR' | 'ADMIN';

export type PermissionSection =
  | 'dashboard'
  | 'pacientes'
  | 'casos-heridas'
  | 'nueva-curacion'
  | 'agenda'
  | 'catalogo-clinico'
  | 'solicitudes-reposicion'
  | 'asistente-clinico'
  | 'configuracion'
  | 'panel-sponsor'
  | 'estadisticas'
  | 'reportes'
  | 'catalogo-productos'
  | 'pedidos'
  | 'configuracion-sponsor'
  | 'admin-productos'
  | 'admin-pedidos'
  | 'admin-cuentas';

const CLINICIAN_PERMISSIONS: readonly PermissionSection[] = [
  'dashboard',
  'pacientes',
  'casos-heridas',
  'nueva-curacion',
  'agenda',
  'catalogo-clinico',
  'solicitudes-reposicion',
  'asistente-clinico',
  'configuracion',
];

const SPONSOR_PERMISSIONS: readonly PermissionSection[] = [
  'panel-sponsor',
  'estadisticas',
  'reportes',
  'catalogo-productos',
  'pedidos',
  'solicitudes-reposicion',
  'configuracion-sponsor',
];

const ADMIN_ONLY_PERMISSIONS: readonly PermissionSection[] = [
  'admin-productos',
  'admin-pedidos',
  'admin-cuentas',
];

export const ROLE_PERMISSIONS: Record<SystemRole, readonly PermissionSection[]> = {
  CLINICIAN: CLINICIAN_PERMISSIONS,
  SPONSOR: SPONSOR_PERMISSIONS,
  ADMIN: Array.from(
    new Set<PermissionSection>([
      ...CLINICIAN_PERMISSIONS,
      ...SPONSOR_PERMISSIONS,
      ...ADMIN_ONLY_PERMISSIONS,
    ]),
  ),
};

/**
 * Matriz central de control de acceso por rol.
 *
 * Nota legal y de producto:
 * - El rol SPONSOR (laboratorio) NO debe acceder a datos clínicos identificables
 *   de pacientes. Esta separación evita exposición de información sensible y
 *   respeta el principio de minimización de datos.
 * - Este control forma parte de los requisitos de cumplimiento vinculados a la
 *   Ley 25.326 de Protección de Datos Personales (Argentina).
 * - Cualquier cambio en esta matriz debe revisarse con criterio legal y de UX
 *   antes de ser promovido a producción.
 */

export const LEGACY_ROLE_TO_SYSTEM_ROLE: Record<AppRole, SystemRole> = {
  professional: 'CLINICIAN',
  sponsor: 'SPONSOR',
  admin: 'ADMIN',
};

