import { describe, it, expect } from 'vitest';
import { deriveTurnoStatus, COMPLETADO_WINDOW_DAYS, findTurnosToSupersede } from '@/lib/appointments';

const PATIENT_ID = 'patient-1';

describe('COMPLETADO_WINDOW_DAYS', () => {
  it('is fixed at 3 days', () => {
    expect(COMPLETADO_WINDOW_DAYS).toBe(3);
  });
});

describe('deriveTurnoStatus', () => {
  it('returns completado when an evolution is logged exactly on the scheduled date', () => {
    const turno = { patient_id: PATIENT_ID, scheduled_date: '2026-07-01', scheduled_time: '10:00', status: 'programado' as const };
    const evolutions = [{ patient_id: PATIENT_ID, created_at: '2026-07-01T12:00:00Z' }];
    const today = new Date('2026-07-01T15:00:00Z');
    expect(deriveTurnoStatus(turno, evolutions, today)).toBe('completado');
  });

  it('returns completado when an evolution is logged 2 days after the scheduled date (within window)', () => {
    const turno = { patient_id: PATIENT_ID, scheduled_date: '2026-07-10', scheduled_time: '10:00', status: 'programado' as const };
    const evolutions = [{ patient_id: PATIENT_ID, created_at: '2026-07-12T09:00:00Z' }];
    const today = new Date('2026-07-13T00:00:00Z');
    expect(deriveTurnoStatus(turno, evolutions, today)).toBe('completado');
  });

  it('returns completado when an evolution is logged exactly 3 days before the scheduled date (boundary, inclusive)', () => {
    const turno = { patient_id: PATIENT_ID, scheduled_date: '2026-07-10', scheduled_time: '10:00', status: 'programado' as const };
    const evolutions = [{ patient_id: PATIENT_ID, created_at: '2026-07-07T00:00:00' }];
    const today = new Date('2026-07-08T00:00:00');
    expect(deriveTurnoStatus(turno, evolutions, today)).toBe('completado');
  });

  it('returns completado when an evolution is logged exactly 3 days after the scheduled date (boundary, inclusive)', () => {
    const turno = { patient_id: PATIENT_ID, scheduled_date: '2026-07-10', scheduled_time: '10:00', status: 'programado' as const };
    const evolutions = [{ patient_id: PATIENT_ID, created_at: '2026-07-13T00:00:00' }];
    const today = new Date('2026-07-14T00:00:00');
    expect(deriveTurnoStatus(turno, evolutions, today)).toBe('completado');
  });

  it('does NOT complete when an evolution is 4 days after the scheduled date (outside window) and falls through to vencido', () => {
    const turno = { patient_id: PATIENT_ID, scheduled_date: '2026-07-10', scheduled_time: '10:00', status: 'programado' as const };
    const evolutions = [{ patient_id: PATIENT_ID, created_at: '2026-07-14T00:00:00' }];
    const today = new Date('2026-07-20T00:00:00');
    expect(deriveTurnoStatus(turno, evolutions, today)).toBe('vencido');
  });

  it('does NOT complete when an evolution is logged 10 days after the scheduled date, and stays programado if not yet past scheduled datetime', () => {
    const turno = { patient_id: PATIENT_ID, scheduled_date: '2026-07-10', scheduled_time: '10:00', status: 'programado' as const };
    const evolutions = [{ patient_id: PATIENT_ID, created_at: '2026-07-20T00:00:00' }];
    const today = new Date('2026-07-10T05:00:00');
    expect(deriveTurnoStatus(turno, evolutions, today)).toBe('programado');
  });

  it('resolves to vencido when the scheduled date has passed and no qualifying evolution exists', () => {
    const turno = { patient_id: PATIENT_ID, scheduled_date: '2026-06-01', scheduled_time: '09:00', status: 'programado' as const };
    const today = new Date('2026-07-01T00:00:00');
    expect(deriveTurnoStatus(turno, [], today)).toBe('vencido');
  });

  it('resolves to programado when the scheduled date is in the future and no evolution exists', () => {
    const turno = { patient_id: PATIENT_ID, scheduled_date: '2026-12-31', scheduled_time: '09:00', status: 'programado' as const };
    const today = new Date('2026-07-01T00:00:00');
    expect(deriveTurnoStatus(turno, [], today)).toBe('programado');
  });

  it('completado takes precedence over vencido when both conditions could apply', () => {
    const turno = { patient_id: PATIENT_ID, scheduled_date: '2026-06-01', scheduled_time: '09:00', status: 'programado' as const };
    const evolutions = [{ patient_id: PATIENT_ID, created_at: '2026-06-02T00:00:00' }];
    const today = new Date('2026-07-01T00:00:00');
    expect(deriveTurnoStatus(turno, evolutions, today)).toBe('completado');
  });

  it('a cancelado turno never becomes completado, even with a qualifying evolution', () => {
    const turno = { patient_id: PATIENT_ID, scheduled_date: '2026-07-01', scheduled_time: '10:00', status: 'cancelado' as const };
    const evolutions = [{ patient_id: PATIENT_ID, created_at: '2026-07-01T12:00:00Z' }];
    const today = new Date('2026-07-01T15:00:00Z');
    expect(deriveTurnoStatus(turno, evolutions, today)).toBe('cancelado');
  });

  it('a cancelado turno never becomes vencido, even when the scheduled date is in the past', () => {
    const turno = { patient_id: PATIENT_ID, scheduled_date: '2026-01-01', scheduled_time: '09:00', status: 'cancelado' as const };
    const today = new Date('2026-07-01T00:00:00');
    expect(deriveTurnoStatus(turno, [], today)).toBe('cancelado');
  });

  it('ignores evolutions belonging to a different patient_id', () => {
    const turno = { patient_id: PATIENT_ID, scheduled_date: '2026-07-01', scheduled_time: '10:00', status: 'programado' as const };
    const evolutions = [{ patient_id: 'patient-other', created_at: '2026-07-01T12:00:00Z' }];
    const today = new Date('2026-06-30T00:00:00');
    expect(deriveTurnoStatus(turno, evolutions, today)).toBe('programado');
  });
});

describe('findTurnosToSupersede', () => {
  it('returns the id of an existing programado turno for the same patient', () => {
    const existing = [
      { id: 't1', patientId: PATIENT_ID, status: 'programado' as const },
    ];
    expect(findTurnosToSupersede(existing, PATIENT_ID)).toEqual(['t1']);
  });

  it('returns the id of an existing vencido turno for the same patient', () => {
    const existing = [
      { id: 't1', patientId: PATIENT_ID, status: 'vencido' as const },
    ];
    expect(findTurnosToSupersede(existing, PATIENT_ID)).toEqual(['t1']);
  });

  it('leaves completado turnos untouched', () => {
    const existing = [
      { id: 't1', patientId: PATIENT_ID, status: 'completado' as const },
    ];
    expect(findTurnosToSupersede(existing, PATIENT_ID)).toEqual([]);
  });

  it('leaves cancelado turnos untouched', () => {
    const existing = [
      { id: 't1', patientId: PATIENT_ID, status: 'cancelado' as const },
    ];
    expect(findTurnosToSupersede(existing, PATIENT_ID)).toEqual([]);
  });

  it('ignores turnos belonging to other patients', () => {
    const existing = [
      { id: 't1', patientId: 'patient-other', status: 'programado' as const },
    ];
    expect(findTurnosToSupersede(existing, PATIENT_ID)).toEqual([]);
  });

  it('returns an empty array when there are no existing turnos', () => {
    expect(findTurnosToSupersede([], PATIENT_ID)).toEqual([]);
  });

  it('returns multiple ids when several unresolved turnos exist for the same patient', () => {
    const existing = [
      { id: 't1', patientId: PATIENT_ID, status: 'programado' as const },
      { id: 't2', patientId: PATIENT_ID, status: 'vencido' as const },
      { id: 't3', patientId: PATIENT_ID, status: 'completado' as const },
      { id: 't4', patientId: 'patient-other', status: 'programado' as const },
    ];
    expect(findTurnosToSupersede(existing, PATIENT_ID)).toEqual(['t1', 't2']);
  });
});
