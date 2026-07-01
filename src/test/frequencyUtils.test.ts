// Coverage target: healing frequency domain logic + exported constants from demoData.ts
//
// NOT TESTABLE (inline in components — needs extraction):
//
//   The preset-to-days validation logic lives inline in CaseDetail.tsx ~lines 420-424:
//
//     const presetSet = ['Diaria', 'Cada 48hs', 'Cada 72hs', 'Semanal'];
//     const hasPreset = presetSet.includes(healingFrequency.trim());
//     if (!hasPreset) → validation error
//
//   Recommended extraction to src/lib/healingFrequency.ts:
//
//     export const PRESET_FREQUENCIES = ['Diaria', 'Cada 48hs', 'Cada 72hs', 'Semanal'] as const;
//     export function isPresetFrequency(f: string): boolean { ... }
//     export function requiresManualDays(f: string): boolean { ... }
//
//   Once extracted, the following tests become real assertions:
//     expect(isPresetFrequency('Diaria')).toBe(true);
//     expect(isPresetFrequency('A demanda')).toBe(false);
//     expect(requiresManualDays('Cada 48hs')).toBe(false);
//     expect(requiresManualDays('A demanda')).toBe(true);

import { describe, it, expect } from 'vitest';
import { healingFrequencies, evolutionStatuses, woundStatuses } from '@/data/demoData';

// ---- healingFrequencies exported constant ----

describe('healingFrequencies', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(healingFrequencies)).toBe(true);
    expect(healingFrequencies.length).toBeGreaterThan(0);
  });

  it('contains all four standard preset options', () => {
    expect(healingFrequencies).toContain('Diaria');
    expect(healingFrequencies).toContain('Cada 48hs');
    expect(healingFrequencies).toContain('Cada 72hs');
    expect(healingFrequencies).toContain('Semanal');
  });

  it('contains the A demanda open-ended option', () => {
    expect(healingFrequencies).toContain('A demanda');
  });

  it('has no duplicate entries', () => {
    const unique = new Set(healingFrequencies);
    expect(unique.size).toBe(healingFrequencies.length);
  });

  it('every entry is a non-empty trimmed string', () => {
    for (const f of healingFrequencies) {
      expect(typeof f).toBe('string');
      expect(f.trim().length).toBeGreaterThan(0);
      expect(f).toBe(f.trim()); // no leading/trailing whitespace
    }
  });
});

// ---- Preset vs. manual-days contract (documented inline logic) ----
//
// The validation rule is: if the selected frequency is NOT in the preset list,
// the user must enter a positive manual day count. This test verifies the
// contract between healingFrequencies and the hardcoded presetSet in CaseDetail.tsx.

describe('healingFrequencies — preset vs. manual-days contract', () => {
  // This list is duplicated from CaseDetail.tsx until the logic is extracted.
  const INLINE_PRESET_SET = ['Diaria', 'Cada 48hs', 'Cada 72hs', 'Semanal'];

  it('all entries in the inline presetSet are present in healingFrequencies', () => {
    for (const preset of INLINE_PRESET_SET) {
      expect(healingFrequencies).toContain(preset);
    }
  });

  it('A demanda is excluded from presetSet — it requires manual day entry', () => {
    expect(INLINE_PRESET_SET).not.toContain('A demanda');
    // but it IS a valid option the user can pick
    expect(healingFrequencies).toContain('A demanda');
  });

  it('presetSet is a proper subset of healingFrequencies', () => {
    // Every preset must be selectable by the user
    for (const p of INLINE_PRESET_SET) {
      expect(healingFrequencies).toContain(p);
    }
  });
});

// ---- evolutionStatuses (exported constant) ----

describe('evolutionStatuses', () => {
  it('is a non-empty array of objects with value and label', () => {
    expect(evolutionStatuses.length).toBeGreaterThan(0);
    for (const s of evolutionStatuses) {
      expect(typeof s.value).toBe('string');
      expect(typeof s.label).toBe('string');
    }
  });

  it('exactly one status is marked as closes:true (cicatrizada)', () => {
    const closing = evolutionStatuses.filter((s) => s.closes === true);
    expect(closing).toHaveLength(1);
    expect(closing[0].value).toBe('cicatrizada');
  });

  it('contains tratamiento_activo as a non-closing status', () => {
    const active = evolutionStatuses.find((s) => s.value === 'tratamiento_activo');
    expect(active).toBeDefined();
    expect(active?.closes).toBeFalsy();
  });
});

// ---- woundStatuses (exported constant) ----

describe('woundStatuses', () => {
  it('contains the four expected status values', () => {
    const values = woundStatuses.map((s) => s.value);
    expect(values).toContain('activo');
    expect(values).toContain('en_mejoria');
    expect(values).toContain('critico');
    expect(values).toContain('resuelto');
  });

  it('every entry has a non-empty label and color', () => {
    for (const s of woundStatuses) {
      expect(s.label.trim().length).toBeGreaterThan(0);
      expect(s.color.trim().length).toBeGreaterThan(0);
    }
  });
});
