import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Patient, WoundCase, Evolution } from '@/data/demoData';
import {
  normalizeAppointmentTime,
  stripNextControlTimeMarker,
  deriveTurnoStatus,
  findTurnosToSupersede,
  type CaseEvolutionInput,
} from '@/lib/appointments';
import type { AppRole } from '@/lib/appRole';
import type { AppContextType, CurrentUser, Turno } from '@/context/AppContext';

// ============================================================================
// EPHEMERAL DEMO MODE
// ============================================================================
// Mirrors AppContext's public shape exactly so no consuming component needs
// to change. Difference: after the one-time baseline read from Supabase,
// every mutation stays in local React state + sessionStorage only — nothing
// is written back to the shared demo Supabase project.
// ============================================================================

// Must match Login.tsx's DEMO_CREDENTIALS.pro — the shared read-only demo
// account used for the public demo deployment.
const DEMO_EMAIL = 'demo.pro@curatrack.app';
const DEMO_PASSWORD = 'DemoPro2024!';

const STORAGE_KEY = 'curatrack_demo_state';

interface DemoTurnoRaw {
  id: string;
  caseId: string | null;
  patientId: string;
  date: string;
  time: string;
  status: 'programado' | 'cancelado';
  notes: string;
}

interface DemoSnapshot {
  patients: Patient[];
  turnoRows: DemoTurnoRaw[];
}

export interface DemoAppContextType extends AppContextType {
  /** Clears the local session snapshot and reloads to the shared baseline. */
  resetDemo: () => void;
}

export const DemoAppContext = createContext<DemoAppContextType | null>(null);

async function fetchBaseline(): Promise<DemoSnapshot> {
  const { data: patientRows, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Demo baseline: error loading patients', error);
    return { patients: [], turnoRows: [] };
  }

  const rows = (patientRows || []) as any[];
  const patientIds = rows.map((p) => p.id);
  const casesById: Record<string, WoundCase[]> = {};
  let turnoRaw: DemoTurnoRaw[] = [];

  if (patientIds.length > 0) {
    const { data: turnoData, error: turnoError } = await supabase
      .from('turnos')
      .select('*')
      .in('patient_id', patientIds);
    if (turnoError) {
      console.error('Demo baseline: error loading turnos', turnoError);
    } else {
      turnoRaw = ((turnoData || []) as any[]).map((t) => ({
        id: t.id,
        caseId: t.case_id,
        patientId: t.patient_id,
        date: t.scheduled_date,
        time: normalizeAppointmentTime(t.scheduled_time),
        status: t.status,
        notes: t.notes ?? '',
      }));
    }

    const { data: caseRows } = await supabase.from('wound_cases').select('*').in('patient_id', patientIds);
    const caseIds = (caseRows || []).map((c: any) => c.id);
    const evosByCase: Record<string, Evolution[]> = {};

    if (caseIds.length > 0) {
      const { data: evoRows } = await supabase
        .from('evolutions')
        .select('*')
        .in('case_id', caseIds)
        .order('evolution_date', { ascending: false })
        .order('evolution_time', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      for (const e of (evoRows || []) as any[]) {
        const ev: Evolution = {
          id: e.id,
          date: e.evolution_date,
          time: e.evolution_time || '',
          professional: e.professional || '',
          description: e.description || '',
          procedure: e.procedure || '',
          materials: e.materials || '',
          observations: stripNextControlTimeMarker(e.observations),
          photos: [],
          painLevel: e.pain_level ?? undefined,
          odor: e.odor ?? undefined,
          exudateAmount: e.exudate_amount ?? undefined,
          exudateType: e.exudate_type ?? undefined,
          exudateColor: e.exudate_color ?? undefined,
          tissueTypes: e.tissue_types ?? [],
          edgeTypes: e.edge_types ?? [],
          woundLength: e.wound_length ?? undefined,
          woundWidth: e.wound_width ?? undefined,
          woundDepth: e.wound_depth ?? undefined,
          hasInfectionSigns: e.has_infection_signs ?? false,
          infMalOlor: e.inf_odor ?? false,
          infEritema: e.inf_redness ?? false,
          infCalor: e.inf_heat ?? false,
          infBiofilm: e.inf_swelling ?? false,
          infPurulenta: e.inf_purulent ?? false,
          infDolorAumentado: e.inf_fever ?? false,
          bodyTemperature: e.body_temperature ?? undefined,
          evolutionStatus: e.evolution_status ?? undefined,
          requiresMedicalOrder: e.requires_medical_order ?? false,
          medicalOrder: e.medical_order ?? '',
          closedAt: e.closed_at ?? undefined,
        };
        (evosByCase[e.case_id] ||= []).push(ev);
      }
    }

    for (const c of (caseRows || []) as any[]) {
      const wc: WoundCase = {
        id: c.id,
        patientId: c.patient_id,
        woundType: c.wound_type,
        anatomicalLocation: c.anatomical_location || '',
        startDate: c.start_date || new Date().toISOString().slice(0, 10),
        status: (c.status || 'activo') as WoundCase['status'],
        evolutions: evosByCase[c.id] || [],
        photos: [],
        treatment: c.treatment || undefined,
        aiSummary: c.ai_summary || undefined,
        aiSummaryUpdatedAt: c.ai_summary_updated_at || undefined,
      };
      (casesById[c.patient_id] ||= []).push(wc);
    }
  }

  const patients: Patient[] = rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    age: row.age ?? 0,
    birthDate: row.birth_date ?? undefined,
    gender: row.gender ?? '',
    dni: row.dni ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    diagnosis: row.diagnosis ?? '',
    assignedProfessional: row.assigned_professional ?? '',
    treatingDoctorName: row.treating_doctor_name ?? '',
    treatingDoctorPhone: row.treating_doctor_phone ?? '',
    observations: row.observations ?? '',
    allergies: row.allergies ?? '',
    insurance: row.insurance ?? '',
    emergencyContactName: row.emergency_contact_name ?? '',
    emergencyContactPhone: row.emergency_contact_phone ?? '',
    admissionDate: row.admission_date ?? new Date().toISOString().split('T')[0],
    cases: casesById[row.id] || [],
  }));

  return { patients, turnoRows: turnoRaw };
}

export function DemoAppProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [turnoRows, setTurnoRows] = useState<DemoTurnoRaw[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const hydratedRef = useRef(false);

  // ---- Bootstrap: silent sign-in, then hydrate from sessionStorage or a fresh baseline read ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      let user = sessionData.session?.user ?? null;
      if (!user) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });
        if (error) {
          console.error('Demo auto sign-in failed', error);
          if (!cancelled) { setAuthReady(true); setPatientsLoading(false); }
          return;
        }
        user = data.user;
      }
      if (cancelled || !user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      if (cancelled) return;

      setCurrentUser({
        id: user.id,
        email: user.email || '',
        firstName: (prof as any)?.first_name || '',
        lastName: (prof as any)?.last_name || '',
        role: ((roleRow as any)?.role as AppRole) || 'professional',
        license: (prof as any)?.license || undefined,
        institution: (prof as any)?.institution || undefined,
      });

      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const snapshot = JSON.parse(stored) as DemoSnapshot;
          hydratedRef.current = true;
          setPatients(snapshot.patients);
          setTurnoRows(snapshot.turnoRows);
          setAuthReady(true);
          setPatientsLoading(false);
          return;
        } catch {
          // Corrupted snapshot — fall through to a fresh baseline read below.
        }
      }

      const baseline = await fetchBaseline();
      if (cancelled) return;
      hydratedRef.current = true;
      setPatients(baseline.patients);
      setTurnoRows(baseline.turnoRows);
      setAuthReady(true);
      setPatientsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // ---- Persist every local change so a reload within this tab keeps edits ----
  useEffect(() => {
    if (!hydratedRef.current) return;
    const snapshot: DemoSnapshot = { patients, turnoRows };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [patients, turnoRows]);

  const isLoggedIn = !!currentUser;
  const currentUserName = currentUser ? `Lic. ${currentUser.firstName} ${currentUser.lastName}`.trim() : '';

  const resetDemo = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }, []);

  // ---- Auth shim (no login UI is ever shown in demo mode) ----
  const login: AppContextType['login'] = useCallback(async () => ({ ok: true }), []);
  const loginWithGoogle: AppContextType['loginWithGoogle'] = useCallback(async () => ({ ok: true }), []);
  const registerUser: AppContextType['registerUser'] = useCallback(
    async () => ({ ok: false, message: 'No disponible en modo demo' }),
    [],
  );
  // "Logging out" of an ephemeral shared demo means starting over, not
  // navigating to a login screen that isn't reachable in this deployment.
  const logout = useCallback(async () => { resetDemo(); }, [resetDemo]);
  const setIsLoggedIn = useCallback((v: boolean) => { if (!v) resetDemo(); }, [resetDemo]);

  // ---- Patients (local only) ----
  const addPatient = useCallback(async (patient: Patient): Promise<string | null> => {
    const id = crypto.randomUUID();
    const newPatient: Patient = { ...patient, id, cases: patient.cases ?? [] };
    setPatients((prev) => [newPatient, ...prev]);
    return id;
  }, []);

  const updatePatient = useCallback(async (patient: Patient) => {
    setPatients((prev) => prev.map((p) => (p.id === patient.id ? { ...patient, cases: p.cases } : p)));
  }, []);

  const deletePatient = useCallback(async (id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
    setTurnoRows((prev) => prev.filter((t) => t.patientId !== id));
  }, []);

  // ---- Cases / Evolutions (local only) ----
  const addCase = useCallback((patientId: string, woundCase: WoundCase) => {
    setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, cases: [...p.cases, woundCase] } : p)));
  }, []);

  const updateCase = useCallback(async (patientId: string, woundCase: WoundCase): Promise<boolean> => {
    setPatients((prev) => prev.map((p) => (
      p.id === patientId
        ? { ...p, cases: p.cases.map((c) => (c.id === woundCase.id ? woundCase : c)) }
        : p
    )));
    return true;
  }, []);

  const deleteCase = useCallback((patientId: string, caseId: string) => {
    setPatients((prev) => prev.map((p) => (
      p.id === patientId ? { ...p, cases: p.cases.filter((c) => c.id !== caseId) } : p
    )));
  }, []);

  const appendEvolutionToState = useCallback((patientId: string, caseId: string, evolution: Evolution) => {
    setPatients((prev) => prev.map((p) => (
      p.id === patientId
        ? { ...p, cases: p.cases.map((c) => (c.id === caseId ? { ...c, evolutions: [evolution, ...c.evolutions] } : c)) }
        : p
    )));
  }, []);

  const addEvolution = useCallback(async (patientId: string, caseId: string, evolution: Evolution): Promise<string | null> => {
    const id = evolution.id || crypto.randomUUID();
    const withId: Evolution = { ...evolution, id };
    setPatients((prev) => prev.map((p) => (
      p.id === patientId
        ? { ...p, cases: p.cases.map((c) => (c.id === caseId ? { ...c, evolutions: [withId, ...c.evolutions] } : c)) }
        : p
    )));
    return id;
  }, []);

  const updateEvolution = useCallback(async (patientId: string, caseId: string, evolution: Evolution): Promise<boolean> => {
    setPatients((prev) => prev.map((p) => (
      p.id === patientId
        ? {
            ...p,
            cases: p.cases.map((c) => (
              c.id === caseId
                ? { ...c, evolutions: c.evolutions.map((e) => (e.id === evolution.id ? evolution : e)) }
                : c
            )),
          }
        : p
    )));
    return true;
  }, []);

  const deleteEvolution = useCallback((patientId: string, caseId: string, evolutionId: string) => {
    setPatients((prev) => prev.map((p) => (
      p.id === patientId
        ? {
            ...p,
            cases: p.cases.map((c) => (
              c.id === caseId ? { ...c, evolutions: c.evolutions.filter((e) => e.id !== evolutionId) } : c
            )),
          }
        : p
    )));
  }, []);

  // ---- Turnos (derived status, local only) ----
  const turnos: Turno[] = useMemo(() => {
    return turnoRows.map((row) => {
      const patientCases = patients.find((p) => p.id === row.patientId)?.cases || [];
      const evolutions: CaseEvolutionInput[] = patientCases.flatMap((c) =>
        c.evolutions.map((e) => ({ patient_id: row.patientId, created_at: e.date })),
      );
      const status = deriveTurnoStatus(
        { patient_id: row.patientId, scheduled_date: row.date, scheduled_time: row.time, status: row.status },
        evolutions,
      );
      return {
        id: row.id,
        caseId: row.caseId,
        patientId: row.patientId,
        date: row.date,
        time: row.time,
        status,
        notes: row.notes,
      };
    });
  }, [turnoRows, patients]);

  const cancelTurno = useCallback(async (id: string) => {
    setTurnoRows((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'cancelado' as const } : t)));
  }, []);

  const createTurno = useCallback(async (input: {
    caseId?: string; patientId: string; date: string; time?: string; notes?: string;
  }): Promise<string | null> => {
    const idsToSupersede = findTurnosToSupersede(turnos, input.patientId);
    if (idsToSupersede.length > 0) {
      setTurnoRows((prev) => prev.map((t) => (idsToSupersede.includes(t.id) ? { ...t, status: 'cancelado' as const } : t)));
    }
    const id = crypto.randomUUID();
    const newRow: DemoTurnoRaw = {
      id,
      caseId: input.caseId ?? null,
      patientId: input.patientId,
      date: input.date,
      time: input.time || '',
      status: 'programado',
      notes: input.notes || '',
    };
    setTurnoRows((prev) => [newRow, ...prev]);
    return id;
  }, [turnos]);

  const updateTurno = useCallback(async (turno: Turno) => {
    setTurnoRows((prev) => prev.map((t) => (
      t.id === turno.id ? { ...t, date: turno.date, time: turno.time, notes: turno.notes } : t
    )));
  }, []);

  const deleteTurno = useCallback(async (id: string) => {
    setTurnoRows((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <DemoAppContext.Provider value={{
      isLoggedIn, authReady, currentUser, currentUserName,
      login, loginWithGoogle, logout, registerUser, setIsLoggedIn,

      patients, patientsLoading,
      addPatient, updatePatient, deletePatient,

      addCase, updateCase, deleteCase,
      addEvolution, appendEvolutionToState, updateEvolution, deleteEvolution,

      turnos, createTurno, updateTurno, cancelTurno, deleteTurno,

      resetDemo,
    }}>
      {children}
    </DemoAppContext.Provider>
  );
}
