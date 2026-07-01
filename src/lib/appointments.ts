const NEXT_CONTROL_TIME_MARKER = '[turno_hora:';
const NEXT_CONTROL_TIME_PATTERN = /\[turno_hora:([01]\d|2[0-3]):([0-5]\d)\]/;

type AppointmentLike = {
  time?: string;
  description?: string;
  observations?: string | null;
  nextControlTime?: string | null;
};

/** Number of days before/after a turno's scheduled_date within which a logged
 * evolution for the same case counts as "fulfilling" it (auto-completado). */
export const COMPLETADO_WINDOW_DAYS = 3;

export type TurnoStatus = 'programado' | 'completado' | 'cancelado' | 'vencido';

export type TurnoStatusInput = {
  case_id: string;
  scheduled_date: string; // 'YYYY-MM-DD'
  scheduled_time?: string | null;
  status: 'programado' | 'cancelado';
};

export type CaseEvolutionInput = {
  case_id: string;
  created_at: string; // ISO date or datetime
};

/**
 * Derives the on-read lifecycle status of a turno.
 * Pure function, no I/O: `today` defaults to `new Date()` but can be
 * injected for deterministic testing.
 */
export function deriveTurnoStatus(
  turno: TurnoStatusInput,
  caseEvolutions: CaseEvolutionInput[],
  today: Date = new Date(),
): TurnoStatus {
  if (turno.status === 'cancelado') return 'cancelado';

  const scheduledDayStart = new Date(`${turno.scheduled_date}T00:00:00`);
  const windowMs = COMPLETADO_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const hasQualifyingEvolution = caseEvolutions.some((evolution) => {
    if (evolution.case_id !== turno.case_id) return false;
    const evolutionDate = new Date(evolution.created_at);
    const evolutionDayStart = new Date(
      evolutionDate.getFullYear(),
      evolutionDate.getMonth(),
      evolutionDate.getDate(),
    );
    return Math.abs(evolutionDayStart.getTime() - scheduledDayStart.getTime()) <= windowMs;
  });

  if (hasQualifyingEvolution) return 'completado';

  const normalizedTime = normalizeAppointmentTime(turno.scheduled_time) || '23:59';
  const scheduledDateTime = new Date(`${turno.scheduled_date}T${normalizedTime}:00`);

  if (scheduledDateTime.getTime() < today.getTime()) return 'vencido';

  return 'programado';
}

export type SupersedeCandidate = {
  id: string;
  caseId: string;
  status: TurnoStatus;
};

/**
 * Given the current app-shape turnos (already carrying their derived status)
 * and a case_id, returns the ids of turnos for that case that are still
 * unresolved (`programado` or `vencido`) and should be superseded/cancelled
 * before a new turno is created for the same case. `completado`/`cancelado`
 * turnos are final/historical and are left untouched.
 */
export function findTurnosToSupersede(
  existingTurnos: SupersedeCandidate[],
  caseId: string,
): string[] {
  return existingTurnos
    .filter(t => t.caseId === caseId && (t.status === 'programado' || t.status === 'vencido'))
    .map(t => t.id);
}

export type TurnoLookup = {
  caseId: string;
  date: string;
  time: string;
  status: TurnoStatus;
};

/**
 * Returns the case's currently active (unresolved) turno — the single
 * upcoming/overdue appointment that represents "próximo control" for that
 * wound now that `turnos` is the source of truth for scheduling.
 */
export function getActiveTurnoForCase<T extends TurnoLookup>(turnos: T[], caseId: string): T | undefined {
  return turnos
    .filter(t => t.caseId === caseId && (t.status === 'programado' || t.status === 'vencido'))
    .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`))[0];
}

export function normalizeAppointmentTime(value?: string | null) {
  if (!value) return '';
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)/);
  return match ? `${match[1]}:${match[2]}` : '';
}

export function extractNextControlTime(observations?: string | null) {
  const match = observations?.match(NEXT_CONTROL_TIME_PATTERN);
  return match ? `${match[1]}:${match[2]}` : '';
}

export function stripNextControlTimeMarker(observations?: string | null) {
  if (!observations) return '';
  return observations
    .replace(NEXT_CONTROL_TIME_PATTERN, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
}

export function getNextControlTime(evolution: AppointmentLike) {
  return normalizeAppointmentTime(evolution.nextControlTime)
    || extractNextControlTime(evolution.observations)
    || (evolution.description === 'Turno programado' ? normalizeAppointmentTime(evolution.time) : '');
}

export function formatNextControl(date?: string | null, time?: string | null) {
  const cleanDate = date || '';
  const cleanTime = normalizeAppointmentTime(time);
  return [cleanDate, cleanTime].filter(Boolean).join(' ');
}
