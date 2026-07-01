// Coverage target: row↔model transformation functions from AppContext +
//                  exported domain utilities (marketplace, age)
//
// STRUCTURAL FINDING:
// NOT TESTABLE: rowToPatient — not exported from src/context/AppContext.tsx
// NOT TESTABLE: patientToRow — not exported from src/context/AppContext.tsx
// NOT TESTABLE: rowToCase    — not exported from src/context/AppContext.tsx
//
// All three are defined as module-private functions inside AppContext.tsx.
// To make them independently testable, extract them to src/lib/patientTransforms.ts
// and export from there. Bug C-6 (patientToRow dropping fields) would be caught
// immediately by a round-trip test if those functions were exported.
//
// Known intentionally dropped fields in patientToRow (no DB column yet):
//   - treatingDoctorName   (Patient field, no PatientRow column)
//   - treatingDoctorPhone  (Patient field, no PatientRow column)
//   - birthDate            (Patient field, no PatientRow column)
//   - cases                (stored in a separate table, not in patients row)
//   - allergies            (Patient field, no PatientRow column)
//   - insurance            (Patient field, no PatientRow column)
//   - emergencyContactName (Patient field, no PatientRow column)
//   - emergencyContactPhone(Patient field, no PatientRow column)

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      single: vi.fn().mockResolvedValue({ data: null }),
    })),
  },
}));

import { getStockStatus } from '@/types/marketplace';
import { calculateAge, getPatientAge, formatPatientAge } from '@/lib/age';
import { demoPatients } from '@/data/demoData';

// ---- getStockStatus (exported marketplace transform) ----

describe('getStockStatus', () => {
  it('returns unknown when stock is null', () => {
    expect(getStockStatus({ stock: null, min_stock: null })).toBe('unknown');
  });

  it('returns out_of_stock when stock is 0', () => {
    expect(getStockStatus({ stock: 0, min_stock: null })).toBe('out_of_stock');
  });

  it('returns out_of_stock when stock is negative', () => {
    expect(getStockStatus({ stock: -1, min_stock: null })).toBe('out_of_stock');
  });

  it('returns low_stock when stock equals min_stock', () => {
    expect(getStockStatus({ stock: 5, min_stock: 5 })).toBe('low_stock');
  });

  it('returns low_stock when stock is below min_stock', () => {
    expect(getStockStatus({ stock: 3, min_stock: 10 })).toBe('low_stock');
  });

  it('returns in_stock when stock exceeds min_stock', () => {
    expect(getStockStatus({ stock: 11, min_stock: 10 })).toBe('in_stock');
  });

  it('returns in_stock when stock is positive and min_stock is null', () => {
    expect(getStockStatus({ stock: 1, min_stock: null })).toBe('in_stock');
  });
});

// ---- calculateAge (exported from src/lib/age.ts) ----

describe('calculateAge', () => {
  it('returns null for null input', () => {
    expect(calculateAge(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(calculateAge(undefined)).toBeNull();
  });

  it('returns null for an invalid date string', () => {
    expect(calculateAge('not-a-date')).toBeNull();
  });

  it('returns a positive integer for a valid past birth date', () => {
    const age = calculateAge('1990-06-15');
    expect(age).toBeGreaterThan(0);
    expect(Number.isInteger(age)).toBe(true);
  });

  it('returns null for unreasonable dates (age > 150)', () => {
    // year 1800 would yield age > 150
    expect(calculateAge('1800-01-01')).toBeNull();
  });
});

// ---- getPatientAge (source-of-truth: birthDate > legacy age field) ----

describe('getPatientAge', () => {
  it('prefers birthDate over the legacy age field when birthDate is valid', () => {
    const result = getPatientAge({ birthDate: '1990-01-01', age: 99 });
    // The computed age from birthDate should NOT be 99
    expect(result).not.toBe(99);
    expect(result).toBeGreaterThan(0);
  });

  it('falls back to legacy age when birthDate is absent', () => {
    expect(getPatientAge({ age: 45 })).toBe(45);
  });

  it('falls back to legacy age when birthDate is null', () => {
    expect(getPatientAge({ birthDate: null, age: 55 })).toBe(55);
  });

  it('returns null when both birthDate and age are absent', () => {
    expect(getPatientAge({})).toBeNull();
  });

  it('returns null when age is 0 and birthDate is absent', () => {
    // age 0 is treated as missing (no info)
    expect(getPatientAge({ age: 0 })).toBeNull();
  });
});

// ---- formatPatientAge ----

describe('formatPatientAge', () => {
  it('returns an em dash when there is no age information', () => {
    expect(formatPatientAge({})).toBe('—');
  });

  it('returns "<n> años" for a patient with a legacy age', () => {
    const result = formatPatientAge({ age: 30 });
    expect(result).toMatch(/^\d+ años$/);
  });

  it('returns "<n> años" derived from birthDate when available', () => {
    const result = formatPatientAge({ birthDate: '1990-01-01' });
    expect(result).toMatch(/^\d+ años$/);
    expect(result).not.toBe('— años');
  });
});

// ---- demoPatients shape sanity ----

describe('demoPatients', () => {
  it('exports a non-empty array', () => {
    expect(demoPatients.length).toBeGreaterThan(0);
  });

  it('every patient has the required string fields', () => {
    for (const p of demoPatients) {
      expect(typeof p.id).toBe('string');
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.firstName).toBe('string');
      expect(typeof p.lastName).toBe('string');
    }
  });

  it('every patient has a cases array (may be empty)', () => {
    for (const p of demoPatients) {
      expect(Array.isArray(p.cases)).toBe(true);
    }
  });
});
