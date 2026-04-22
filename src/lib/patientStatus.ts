import { Patient, WoundCase, Evolution, EvolutionStatus } from '@/data/demoData';

export type HealthIndicator = 'improving' | 'stable' | 'deteriorating' | 'closed';

export const indicatorMeta: Record<HealthIndicator, { label: string; dotClass: string; ringClass: string; textClass: string }> = {
  improving:     { label: 'Mejorando',      dotClass: 'bg-success',     ringClass: 'ring-success/40',     textClass: 'text-success' },
  stable:        { label: 'Estable',        dotClass: 'bg-warning',     ringClass: 'ring-warning/40',     textClass: 'text-warning' },
  deteriorating: { label: 'En deterioro',   dotClass: 'bg-destructive', ringClass: 'ring-destructive/40', textClass: 'text-destructive' },
  closed:        { label: 'Cerrada',        dotClass: 'bg-muted-foreground', ringClass: 'ring-muted-foreground/30', textClass: 'text-muted-foreground' },
};

export function getLatestEvolution(c: WoundCase): Evolution | undefined {
  if (!c.evolutions.length) return undefined;
  return [...c.evolutions].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
}

export function getCaseIndicator(c: WoundCase): HealthIndicator {
  if (c.status === 'resuelto') return 'closed';
  const last = getLatestEvolution(c);
  const st = last?.evolutionStatus as EvolutionStatus | undefined;
  if (st === 'cicatrizada') return 'closed';
  if (st === 'mejoria_progresiva') return 'improving';
  if (st === 'deterioro' || st === 'requiere_evaluacion' || c.status === 'critico') return 'deteriorating';
  if (st === 'sin_cambios') return 'stable';
  if (c.status === 'en_mejoria') return 'improving';
  return 'stable';
}

export function getPatientIndicator(p: Patient): HealthIndicator {
  const active = p.cases.filter(c => c.status !== 'resuelto');
  if (active.length === 0) return 'closed';
  const indicators = active.map(getCaseIndicator);
  if (indicators.includes('deteriorating')) return 'deteriorating';
  if (indicators.every(i => i === 'improving')) return 'improving';
  if (indicators.includes('improving')) return 'improving';
  return 'stable';
}

export function getActiveWoundCount(p: Patient): number {
  return p.cases.filter(c => c.status !== 'resuelto').length;
}

export function getLastEvolutionDate(p: Patient): string | null {
  const dates = p.cases
    .flatMap(c => c.evolutions.map(e => e.date))
    .filter(Boolean)
    .sort()
    .reverse();
  return dates[0] || null;
}

export function getEvolutionArea(e: Evolution): number | null {
  const l = typeof e.woundLength === 'number' ? e.woundLength : NaN;
  const w = typeof e.woundWidth === 'number' ? e.woundWidth : NaN;
  if (!isFinite(l) || !isFinite(w) || l <= 0 || w <= 0) return null;
  return l * w;
}
