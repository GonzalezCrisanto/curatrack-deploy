// Coverage target: src/lib/appRole.ts — resolveAppRoleFromRows pure function

import { describe, it, expect, vi } from 'vitest';

// The module imports supabase at the top level for getUserAppRole.
// Mock it here so the import doesn't blow up in the test environment.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

import { resolveAppRoleFromRows } from '@/lib/appRole';

describe('resolveAppRoleFromRows', () => {
  describe('defaults', () => {
    it('returns professional for an empty array', () => {
      expect(resolveAppRoleFromRows([])).toBe('professional');
    });

    it('returns professional for an unrecognized role string', () => {
      expect(resolveAppRoleFromRows(['unknown_role'])).toBe('professional');
    });

    it('returns professional when the array contains only the professional role', () => {
      expect(resolveAppRoleFromRows(['professional'])).toBe('professional');
    });
  });

  describe('single recognized roles', () => {
    it('returns admin when the array contains admin', () => {
      expect(resolveAppRoleFromRows(['admin'])).toBe('admin');
    });

    it('returns sponsor when the array contains sponsor', () => {
      expect(resolveAppRoleFromRows(['sponsor'])).toBe('sponsor');
    });
  });

  describe('priority: admin > sponsor > professional', () => {
    it('admin wins over sponsor when both are present', () => {
      expect(resolveAppRoleFromRows(['sponsor', 'admin'])).toBe('admin');
    });

    it('admin wins over professional when both are present', () => {
      expect(resolveAppRoleFromRows(['professional', 'admin'])).toBe('admin');
    });

    it('admin wins when all three roles are present', () => {
      expect(resolveAppRoleFromRows(['professional', 'sponsor', 'admin'])).toBe('admin');
    });

    it('sponsor wins over professional when both are present', () => {
      expect(resolveAppRoleFromRows(['professional', 'sponsor'])).toBe('sponsor');
    });
  });

  describe('edge cases', () => {
    it('handles duplicate role entries without error', () => {
      expect(resolveAppRoleFromRows(['admin', 'admin'])).toBe('admin');
    });

    it('handles a mix of recognized and unrecognized roles — recognized wins', () => {
      expect(resolveAppRoleFromRows(['unknown', 'sponsor'])).toBe('sponsor');
    });
  });
});
