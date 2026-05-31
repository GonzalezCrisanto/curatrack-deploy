const NEXT_CONTROL_TIME_MARKER = '[turno_hora:';
const NEXT_CONTROL_TIME_PATTERN = /\[turno_hora:([01]\d|2[0-3]):([0-5]\d)\]/;

type AppointmentLike = {
  time?: string;
  description?: string;
  observations?: string | null;
  nextControlTime?: string | null;
};

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

export function appendNextControlTimeMarker(observations: string | null | undefined, time?: string | null) {
  const cleanObservations = stripNextControlTimeMarker(observations);
  const normalizedTime = normalizeAppointmentTime(time);
  if (!normalizedTime) return cleanObservations || null;
  const marker = `${NEXT_CONTROL_TIME_MARKER}${normalizedTime}]`;
  return cleanObservations ? `${cleanObservations}\n${marker}` : marker;
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
