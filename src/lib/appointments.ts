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
  patient_id: string;
  scheduled_date: string; // 'YYYY-MM-DD'
  scheduled_time?: string | null;
  status: 'programado' | 'cancelado';
};

export type CaseEvolutionInput = {
  patient_id: string;
  created_at: string; // ISO date or datetime
};

/**
 * Derives the on-read lifecycle status of a turno.
 * A turno covers the whole patient visit (not a single wound), so it's
 * considered fulfilled by an evolution logged for ANY of the patient's
 * cases within the window — not just one specific case.
 * Pure function, no I/O: `today` defaults to `new Date()` but can be
 * injected for deterministic testing.
 */
export function deriveTurnoStatus(
  turno: TurnoStatusInput,
  patientEvolutions: CaseEvolutionInput[],
  today: Date = new Date(),
): TurnoStatus {
  if (turno.status === 'cancelado') return 'cancelado';

  const scheduledDayStart = new Date(`${turno.scheduled_date}T00:00:00`);
  const windowMs = COMPLETADO_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const hasQualifyingEvolution = patientEvolutions.some((evolution) => {
    if (evolution.patient_id !== turno.patient_id) return false;
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
  patientId: string;
  status: TurnoStatus;
};

/**
 * Given the current app-shape turnos (already carrying their derived status)
 * and a patient_id, returns the ids of turnos for that patient that are still
 * unresolved (`programado` or `vencido`) and should be superseded/cancelled
 * before a new turno is created for that patient. `completado`/`cancelado`
 * turnos are final/historical and are left untouched.
 */
export function findTurnosToSupersede(
  existingTurnos: SupersedeCandidate[],
  patientId: string,
): string[] {
  return existingTurnos
    .filter(t => t.patientId === patientId && (t.status === 'programado' || t.status === 'vencido'))
    .map(t => t.id);
}

export type TurnoLookup = {
  patientId: string;
  date: string;
  time: string;
  status: TurnoStatus;
};

/**
 * Returns the patient's currently active (unresolved) turno — the single
 * upcoming/overdue appointment that represents "próximo control" for that
 * patient's visit now that `turnos` is the source of truth for scheduling.
 */
export function getActiveTurnoForPatient<T extends TurnoLookup>(turnos: T[], patientId: string): T | undefined {
  return turnos
    .filter(t => t.patientId === patientId && (t.status === 'programado' || t.status === 'vencido'))
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
