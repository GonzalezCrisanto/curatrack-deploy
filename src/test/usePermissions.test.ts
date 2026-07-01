// Coverage target: src/hooks/usePermissions.ts — permission resolution per AppRole

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// usePermissions depends on useAppRole; mock it so we can drive the role directly
// without needing a full AppContext + Supabase stack.
vi.mock('@/hooks/useAppRole', () => ({
  useAppRole: vi.fn(),
}));

import { usePermissions } from '@/hooks/usePermissions';
import { useAppRole } from '@/hooks/useAppRole';

const mockUseAppRole = useAppRole as ReturnType<typeof vi.fn>;

// ---- Permission strings come from src/config/permissions.ts (PermissionSection type) ----
// CLINICIAN permissions: dashboard, pacientes, casos-heridas, nueva-herida, nueva-curacion,
//   agenda, catalogo-clinico, solicitudes-reposicion, asistente-clinico, configuracion
// SPONSOR permissions:   panel-sponsor, estadisticas, reportes, catalogo-productos,
//   pedidos, solicitudes-reposicion, configuracion-sponsor
// ADMIN permissions:     union of all above + admin-productos, admin-pedidos, admin-cuentas

describe('usePermissions — professional (→ CLINICIAN)', () => {
  beforeEach(() => {
    mockUseAppRole.mockReturnValue({ role: 'professional', ready: true });
  });

  it('can access the pacientes section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('pacientes')).toBe(true);
  });

  it('can access the dashboard section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('dashboard')).toBe(true);
  });

  it('can access nueva-curacion section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('nueva-curacion')).toBe(true);
  });

  it('cannot access panel-sponsor section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('panel-sponsor')).toBe(false);
  });

  it('cannot access admin-productos section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('admin-productos')).toBe(false);
  });

  it('cannot access admin-cuentas section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('admin-cuentas')).toBe(false);
  });

  it('reports isClinicalRole true and others false', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isClinicalRole).toBe(true);
    expect(result.current.isSponsorRole).toBe(false);
    expect(result.current.isAdminRole).toBe(false);
  });

  it('is ready', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.ready).toBe(true);
  });
});

describe('usePermissions — admin (→ ADMIN)', () => {
  beforeEach(() => {
    mockUseAppRole.mockReturnValue({ role: 'admin', ready: true });
  });

  it('can access admin-productos section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('admin-productos')).toBe(true);
  });

  it('can access admin-pedidos section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('admin-pedidos')).toBe(true);
  });

  it('can access admin-cuentas section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('admin-cuentas')).toBe(true);
  });

  it('can access clinical sections (admin is a superset)', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('pacientes')).toBe(true);
    expect(result.current.can('dashboard')).toBe(true);
  });

  it('can access sponsor sections (admin is a superset)', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('panel-sponsor')).toBe(true);
    expect(result.current.can('estadisticas')).toBe(true);
  });

  it('reports isAdminRole true and others false', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isAdminRole).toBe(true);
    expect(result.current.isClinicalRole).toBe(false);
    expect(result.current.isSponsorRole).toBe(false);
  });
});

describe('usePermissions — sponsor (→ SPONSOR)', () => {
  beforeEach(() => {
    mockUseAppRole.mockReturnValue({ role: 'sponsor', ready: true });
  });

  it('can access panel-sponsor section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('panel-sponsor')).toBe(true);
  });

  it('can access estadisticas section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('estadisticas')).toBe(true);
  });

  it('cannot access pacientes section — data isolation rule (Ley 25.326)', () => {
    // Sponsors must NOT see individual patient records.
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('pacientes')).toBe(false);
  });

  it('cannot access dashboard section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('dashboard')).toBe(false);
  });

  it('cannot access admin-cuentas section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('admin-cuentas')).toBe(false);
  });

  it('reports isSponsorRole true and others false', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isSponsorRole).toBe(true);
    expect(result.current.isClinicalRole).toBe(false);
    expect(result.current.isAdminRole).toBe(false);
  });
});

describe('usePermissions — null role (unauthenticated / loading)', () => {
  beforeEach(() => {
    mockUseAppRole.mockReturnValue({ role: null, ready: false });
  });

  it('can() returns false for any section', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('dashboard')).toBe(false);
    expect(result.current.can('panel-sponsor')).toBe(false);
    expect(result.current.can('admin-productos')).toBe(false);
  });

  it('all role flags are false', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isClinicalRole).toBe(false);
    expect(result.current.isSponsorRole).toBe(false);
    expect(result.current.isAdminRole).toBe(false);
  });

  it('ready is false', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.ready).toBe(false);
  });
});
