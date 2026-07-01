// Coverage target: src/components/RoleGuard.tsx — role-based rendering and homeForRole

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// RoleGuard calls useApp() and useAppRole() — mock both so tests are
// fully isolated from the Supabase/auth stack.
vi.mock('@/context/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/hooks/useAppRole', () => ({
  useAppRole: vi.fn(),
}));

// Skeleton is a trivial presentational component; stub it to avoid
// transitive shadcn/class-variance-authority dependencies in jsdom.
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// Mock react-router-dom to avoid loading its full dependency tree in jsdom,
// which causes heap OOM. RoleGuard only uses Navigate and useLocation from it.
let capturedNavigateTo: string | null = null;
vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => {
    capturedNavigateTo = to;
    return <div data-testid="navigate" data-to={to} />;
  },
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
}));

import { RoleGuard, homeForRole } from '@/components/RoleGuard';
import { useApp } from '@/context/AppContext';
import { useAppRole } from '@/hooks/useAppRole';

const mockUseApp = useApp as ReturnType<typeof vi.fn>;
const mockUseAppRole = useAppRole as ReturnType<typeof vi.fn>;

function renderGuard(ui: React.ReactElement) {
  capturedNavigateTo = null;
  return render(ui);
}

// ---- Loading states ----

describe('RoleGuard — loading states', () => {
  it('renders skeleton placeholders when authReady is false', () => {
    mockUseApp.mockReturnValue({ authReady: false, isLoggedIn: false });
    mockUseAppRole.mockReturnValue({ role: null, ready: false });

    renderGuard(
      <RoleGuard allow={['professional']}>
        <div>protected</div>
      </RoleGuard>
    );

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText('protected')).toBeNull();
  });

  it('renders skeleton when auth is ready but role resolution is still in flight', () => {
    mockUseApp.mockReturnValue({ authReady: true, isLoggedIn: true });
    mockUseAppRole.mockReturnValue({ role: null, ready: false });

    renderGuard(
      <RoleGuard allow={['professional']}>
        <div>protected</div>
      </RoleGuard>
    );

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText('protected')).toBeNull();
  });
});

// ---- Unauthenticated ----

describe('RoleGuard — unauthenticated user', () => {
  it('does not render children when the user is not logged in', () => {
    mockUseApp.mockReturnValue({ authReady: true, isLoggedIn: false });
    mockUseAppRole.mockReturnValue({ role: null, ready: true });

    renderGuard(
      <RoleGuard allow={['professional']}>
        <div>protected</div>
      </RoleGuard>
    );

    // Navigate mock renders instead of children
    expect(screen.queryByText('protected')).toBeNull();
    expect(screen.getByTestId('navigate')).toBeTruthy();
  });
});

// ---- Allowed roles ----

describe('RoleGuard — allowed roles render children', () => {
  beforeEach(() => {
    mockUseApp.mockReturnValue({ authReady: true, isLoggedIn: true });
  });

  it('renders children when the user role matches the single allowed role', () => {
    mockUseAppRole.mockReturnValue({ role: 'professional', ready: true });

    renderGuard(
      <RoleGuard allow={['professional']}>
        <div>clinical dashboard</div>
      </RoleGuard>
    );

    expect(screen.getByText('clinical dashboard')).toBeTruthy();
  });

  it('renders children for admin when admin is in the allow list', () => {
    mockUseAppRole.mockReturnValue({ role: 'admin', ready: true });

    renderGuard(
      <RoleGuard allow={['professional', 'admin']}>
        <div>shared content</div>
      </RoleGuard>
    );

    expect(screen.getByText('shared content')).toBeTruthy();
  });

  it('renders children for sponsor when sponsor is in the allow list', () => {
    mockUseAppRole.mockReturnValue({ role: 'sponsor', ready: true });

    renderGuard(
      <RoleGuard allow={['sponsor']}>
        <div>sponsor panel</div>
      </RoleGuard>
    );

    expect(screen.getByText('sponsor panel')).toBeTruthy();
  });

  it('renders children when allow list contains all three roles', () => {
    mockUseAppRole.mockReturnValue({ role: 'professional', ready: true });

    renderGuard(
      <RoleGuard allow={['professional', 'sponsor', 'admin']}>
        <div>universal content</div>
      </RoleGuard>
    );

    expect(screen.getByText('universal content')).toBeTruthy();
  });
});

// ---- Disallowed roles ----

describe('RoleGuard — disallowed roles redirect away', () => {
  beforeEach(() => {
    mockUseApp.mockReturnValue({ authReady: true, isLoggedIn: true });
  });

  it('does not render children when the user role is not in the allow list', () => {
    mockUseAppRole.mockReturnValue({ role: 'sponsor', ready: true });

    renderGuard(
      <RoleGuard allow={['professional']}>
        <div>clinical content</div>
      </RoleGuard>
    );

    expect(screen.queryByText('clinical content')).toBeNull();
  });

  it('does not render children when professional tries to access an admin-only route', () => {
    mockUseAppRole.mockReturnValue({ role: 'professional', ready: true });

    renderGuard(
      <RoleGuard allow={['admin']}>
        <div>admin content</div>
      </RoleGuard>
    );

    expect(screen.queryByText('admin content')).toBeNull();
  });
});

// ---- homeForRole (exported pure function) ----

describe('homeForRole', () => {
  it('returns /panel-sponsor for the sponsor role', () => {
    expect(homeForRole('sponsor')).toBe('/panel-sponsor');
  });

  it('returns /dashboard for the professional role', () => {
    expect(homeForRole('professional')).toBe('/dashboard');
  });

  it('returns /dashboard for the admin role', () => {
    expect(homeForRole('admin')).toBe('/dashboard');
  });

  it('returns /dashboard when role is null (unauthenticated fallback)', () => {
    expect(homeForRole(null)).toBe('/dashboard');
  });
});
