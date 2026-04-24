/**
 * Patient age utilities.
 *
 * Source of truth is `birthDate` (YYYY-MM-DD). The legacy `age` field is kept
 * for backward compatibility with records that don't have a birth date yet.
 */
export function calculateAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  if (age < 0 || age > 150) return null;
  return age;
}

export function getPatientAge(p: { birthDate?: string | null; age?: number | null }): number | null {
  const fromDate = calculateAge(p.birthDate);
  if (fromDate !== null) return fromDate;
  return typeof p.age === 'number' && p.age > 0 ? p.age : null;
}

export function formatPatientAge(p: { birthDate?: string | null; age?: number | null }): string {
  const a = getPatientAge(p);
  return a === null ? '—' : `${a} años`;
}
