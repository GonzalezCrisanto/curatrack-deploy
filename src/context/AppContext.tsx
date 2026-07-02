import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Patient, WoundCase, Evolution } from '@/data/demoData';
import {
  normalizeAppointmentTime,
  stripNextControlTimeMarker,
  deriveTurnoStatus,
  findTurnosToSupersede,
  type TurnoStatus,
  type CaseEvolutionInput,
} from '@/lib/appointments';
import type { AppRole } from '@/lib/appRole';

// ============================================================================
// PHASE 1 BACKEND MIGRATION
// ============================================================================
// Auth + the `patients` table now live in Lovable Cloud (Supabase).
// Cases, evolutions and photos are still kept in browser memory for now —
// they will be migrated in Phase 2. When a user logs in we hydrate the in-memory
// `casesByPatient` map from the demoData seed so the UI keeps working.
// ============================================================================

interface ProfileRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  institution: string | null;
  license: string | null;
}

interface PatientRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  birth_date: string | null;
  gender: string | null;
  dni: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  diagnosis: string | null;
  assigned_professional: string | null;
  treating_doctor_name: string | null;
  treating_doctor_phone: string | null;
  observations: string | null;
  allergies: string | null;
  insurance: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  admission_date: string | null;
}

// Mapping helpers between DB rows and the Patient shape used by the app
function rowToPatient(row: PatientRow, cases: WoundCase[]): Patient {
  return {
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
    cases,
  };
}

function patientToRow(p: Patient, userId: string): Omit<PatientRow, 'id'> & { id?: string } {
  return {
    id: p.id,
    user_id: userId,
    first_name: p.firstName,
    last_name: p.lastName,
    age: p.age || null,
    birth_date: p.birthDate || null,
    gender: p.gender || null,
    dni: p.dni || null,
    phone: p.phone || null,
    email: p.email || null,
    address: p.address || null,
    diagnosis: p.diagnosis || null,
    assigned_professional: p.assignedProfessional || null,
    treating_doctor_name: p.treatingDoctorName || null,
    treating_doctor_phone: p.treatingDoctorPhone || null,
    observations: p.observations || null,
    allergies: p.allergies || null,
    insurance: p.insurance || null,
    emergency_contact_name: p.emergencyContactName || null,
    emergency_contact_phone: p.emergencyContactPhone || null,
    admission_date: p.admissionDate || null,
  };
}

interface TurnoRow {
  id: string;
  user_id: string;
  case_id: string | null;
  patient_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: 'programado' | 'cancelado';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Turno {
  id: string;
  caseId: string | null;
  patientId: string;
  date: string;
  time: string;
  status: TurnoStatus;
  notes: string;
}

// ============================================================================

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  license?: string;
  institution?: string;
}

interface AppContextType {
  // Auth
  isLoggedIn: boolean;
  authReady: boolean;
  currentUser: CurrentUser | null;
  currentUserName: string;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  loginWithGoogle: () => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  registerUser: (data: {
    email: string; password: string;
    firstName: string; lastName: string;
    role: AppRole;
    license?: string; institution?: string;
  }) => Promise<{ ok: boolean; message?: string; needsEmailConfirmation?: boolean }>;

  // Patients (synced with backend)
  patients: Patient[];
  patientsLoading: boolean;
  addPatient: (patient: Patient) => Promise<string | null>;
  updatePatient: (patient: Patient) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;

  // Cases & Evolutions
  addCase: (patientId: string, woundCase: WoundCase) => void;
  updateCase: (patientId: string, woundCase: WoundCase) => Promise<boolean>;
  deleteCase: (patientId: string, caseId: string) => void;
  addEvolution: (patientId: string, caseId: string, evolution: Evolution) => Promise<string | null>;
  appendEvolutionToState: (patientId: string, caseId: string, evolution: Evolution) => void;
  updateEvolution: (patientId: string, caseId: string, evolution: Evolution) => Promise<boolean>;
  deleteEvolution: (patientId: string, caseId: string, evolutionId: string) => void;

  // Turnos (appointments, synced with backend)
  turnos: Turno[];
  createTurno: (input: { caseId?: string; patientId: string; date: string; time?: string; notes?: string }) => Promise<string | null>;
  updateTurno: (turno: Turno) => Promise<void>;
  cancelTurno: (id: string) => Promise<void>;
  deleteTurno: (id: string) => Promise<void>;

  // Compatibility shim
  setIsLoggedIn: (v: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [patientRows, setPatientRows] = useState<PatientRow[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);

  // In-memory case/evolution store keyed by patientId. Hydrated from seed data
  // for convenience while Phase 2 (cases backend) is pending.
  const [casesByPatient, setCasesByPatient] = useState<Record<string, WoundCase[]>>({});

  const [turnoRows, setTurnoRows] = useState<TurnoRow[]>([]);

  // ---- Auth bootstrap ----
  useEffect(() => {
    // 1) Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setAuthUser(null);
      } else if (newSession?.user) {
        setSession(newSession);
        // Keep the same object reference when the signed-in user hasn't
        // changed (e.g. TOKEN_REFRESHED on tab focus/visibility regain).
        // Otherwise every token refresh produces a new `authUser` object,
        // which cascades through the `currentUser` memo into useAppRole's
        // effect and flashes the RoleGuard skeleton on every reference change.
        setAuthUser(prev => (prev?.id === newSession.user.id ? prev : newSession.user));
      }
      // TOKEN_REFRESHED and other intermediate events with null session are ignored
      // to prevent transient logouts that cause navigation to /login
    });

    // 2) Then load existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthUser(data.session?.user ?? null);
      setAuthReady(true);
    }).catch(() => {
      // Stale/invalid refresh token left over in storage (e.g. after a
      // Supabase project rotation) — drop it so the app falls back to /login
      // instead of hanging on the loading skeleton.
      supabase.auth.signOut();
      setSession(null);
      setAuthUser(null);
      setAuthReady(true);
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // ---- Load profile + patients when auth user changes ----
  useEffect(() => {
    if (!authUser) {
      setProfile(null);
      setUserRole(null);
      setPatientRows([]);
      setCasesByPatient({});
      setTurnoRows([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setPatientsLoading(true);

      // Profile (might not exist yet right after signup if trigger is delayed)
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();
      if (!cancelled) setProfile(prof as ProfileRow | null);

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id)
        .maybeSingle();
      if (!cancelled) setUserRole(roleRow?.role ?? null);

      // Patients
      const { data: pats, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      if (!cancelled) {
        if (error) {
          console.error('Error loading patients', error);
          setPatientRows([]);
        } else {
          setPatientRows((pats || []) as PatientRow[]);
        }

        // Load wound_cases + evolutions for these patients from the backend.
        const patientIds = (pats || []).map((p: any) => p.id);
        const casesById: Record<string, WoundCase[]> = {};
        if (patientIds.length > 0) {
          const { data: turnoData, error: turnoError } = await supabase
            .from('turnos')
            .select('*')
            .in('patient_id', patientIds);
          if (!cancelled) {
            if (turnoError) {
              console.error('Error loading turnos', turnoError);
              setTurnoRows([]);
            } else {
              setTurnoRows((turnoData || []) as TurnoRow[]);
            }
          }
        } else if (!cancelled) {
          setTurnoRows([]);
        }
        if (patientIds.length > 0) {
          const { data: caseRows } = await supabase
            .from('wound_cases')
            .select('*')
            .in('patient_id', patientIds);
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

        setCasesByPatient(prev => {
          const next = { ...prev };
          for (const row of (pats || []) as PatientRow[]) {
            if (next[row.id]) continue;
            next[row.id] = casesById[row.id] || [];
          }
          return next;
        });

        setPatientsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authUser?.id]);

  const currentUser: CurrentUser | null = useMemo(() => {
    if (!authUser) return null;
    return {
      id: authUser.id,
      email: authUser.email || '',
      firstName: profile?.first_name || authUser.user_metadata?.first_name || '',
      lastName: profile?.last_name || authUser.user_metadata?.last_name || '',
      role: (userRole as AppRole) || 'professional',
      license: profile?.license || undefined,
      institution: profile?.institution || undefined,
    };
  }, [authUser, profile, userRole]);

  const isLoggedIn = !!session;
  const currentUserName = currentUser
    ? `Lic. ${currentUser.firstName} ${currentUser.lastName}`.trim()
    : '';

  // ---- Auth actions ----
  const login: AppContextType['login'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  };

  const loginWithGoogle: AppContextType['loginWithGoogle'] = async () => {
    const { lovable } = await import('@/integrations/lovable');
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin + '/dashboard',
    });
    if (result.error) return { ok: false, message: (result.error as Error).message };
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const registerUser: AppContextType['registerUser'] = async (data) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { data: signUp, error } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role,
          institution: data.institution || null,
          license: data.license || null,
        },
      },
    });
    if (error) return { ok: false, message: error.message };
    const needsConfirmation = !signUp.session;
    return { ok: true, needsEmailConfirmation: needsConfirmation };
  };

  const setIsLoggedIn = (v: boolean) => { if (!v) void logout(); };

  // ---- Patient CRUD (backend) ----
  const addPatient = useCallback(async (patient: Patient) => {
    if (!authUser) return null;
    const row = patientToRow(patient, authUser.id);
    // Let the DB generate the id
    const { id: _ignore, ...insertable } = row;
    const { data, error } = await supabase
      .from('patients')
      .insert(insertable)
      .select()
      .single();
    if (error) {
      console.error('addPatient error', error);
      return null;
    }
    setPatientRows(prev => [data as PatientRow, ...prev]);
    setCasesByPatient(prev => ({ ...prev, [(data as PatientRow).id]: [] }));
    return (data as PatientRow).id;
  }, [authUser?.id]);

  const updatePatient = useCallback(async (patient: Patient) => {
    if (!authUser) return;
    const row = patientToRow(patient, authUser.id);
    const { id: _ignore, user_id: _ignore2, ...updatable } = row;
    const { error } = await supabase
      .from('patients')
      .update(updatable)
      .eq('id', patient.id);
    if (error) { console.error('updatePatient error', error); return; }
    setPatientRows(prev => prev.map(r => r.id === patient.id ? { ...r, ...updatable } as PatientRow : r));
  }, [authUser?.id]);

  const deletePatient = useCallback(async (id: string) => {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) { console.error('deletePatient error', error); return; }
    setPatientRows(prev => prev.filter(r => r.id !== id));
    setCasesByPatient(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // ---- Cases / Evolutions ----
  const addCase = useCallback((patientId: string, woundCase: WoundCase) => {
    setCasesByPatient(prev => ({ ...prev, [patientId]: [...(prev[patientId] || []), woundCase] }));
  }, []);

  const updateCase = useCallback(async (patientId: string, woundCase: WoundCase): Promise<boolean> => {
    setCasesByPatient(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map(c => c.id === woundCase.id ? woundCase : c),
    }));
    if (!authUser) return false;
    const { error } = await supabase.from('wound_cases').update({
      wound_type: woundCase.woundType,
      anatomical_location: woundCase.anatomicalLocation || null,
      start_date: woundCase.startDate || null,
      status: woundCase.status,
      treatment: woundCase.treatment || null,
      ai_summary: woundCase.aiSummary || null,
      ai_summary_updated_at: woundCase.aiSummaryUpdatedAt || null,
    }).eq('id', woundCase.id).eq('user_id', authUser.id);
    if (error) {
      console.error('updateCase DB error', error);
      return false;
    }
    return true;
  }, [authUser?.id]);

  const deleteCase = useCallback((patientId: string, caseId: string) => {
    setCasesByPatient(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).filter(c => c.id !== caseId),
    }));
  }, []);

  const appendEvolutionToState = useCallback((patientId: string, caseId: string, evolution: Evolution) => {
    setCasesByPatient(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map(c =>
        c.id === caseId ? { ...c, evolutions: [evolution, ...c.evolutions] } : c
      ),
    }));
  }, []);

  const addEvolution = useCallback(async (patientId: string, caseId: string, evolution: Evolution): Promise<string | null> => {
    const tempId = evolution.id;
    setCasesByPatient(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map(c =>
        c.id === caseId ? { ...c, evolutions: [evolution, ...c.evolutions] } : c
      ),
    }));
    if (!authUser) return null;
    const { data, error } = await supabase.from('evolutions').insert({
      user_id: authUser.id,
      case_id: caseId,
      evolution_date: evolution.date,
      evolution_time: evolution.time || null,
      professional: evolution.professional || null,
      procedure: evolution.procedure || null,
      materials: evolution.materials || null,
      description: evolution.description || null,
      observations: evolution.observations || null,
      pain_level: typeof evolution.painLevel === 'number' ? evolution.painLevel : null,
      odor: evolution.odor || null,
      exudate_amount: evolution.exudateAmount || null,
      exudate_type: evolution.exudateType || null,
      exudate_color: evolution.exudateColor || null,
      tissue_types: (evolution.tissueTypes?.length ?? 0) > 0 ? evolution.tissueTypes : null,
      edge_types: (evolution.edgeTypes?.length ?? 0) > 0 ? evolution.edgeTypes : null,
      wound_length: typeof evolution.woundLength === 'number' ? evolution.woundLength : null,
      wound_width: typeof evolution.woundWidth === 'number' ? evolution.woundWidth : null,
      wound_depth: typeof evolution.woundDepth === 'number' ? evolution.woundDepth : null,
      has_infection_signs: evolution.hasInfectionSigns ?? false,
      inf_odor: evolution.infMalOlor ?? false,
      inf_redness: evolution.infEritema ?? false,
      inf_heat: evolution.infCalor ?? false,
      inf_swelling: evolution.infBiofilm ?? false,
      inf_purulent: evolution.infPurulenta ?? false,
      inf_fever: evolution.infDolorAumentado ?? false,
      body_temperature: typeof evolution.bodyTemperature === 'number' ? evolution.bodyTemperature : null,
      evolution_status: evolution.evolutionStatus || null,
      requires_medical_order: evolution.requiresMedicalOrder ?? false,
      medical_order: evolution.medicalOrder || null,
      closed_at: evolution.closedAt || null,
    }).select('id').single();
    if (error) {
      console.error('addEvolution DB error', error);
      setCasesByPatient(prev => ({
        ...prev,
        [patientId]: (prev[patientId] || []).map(c =>
          c.id === caseId ? { ...c, evolutions: c.evolutions.filter(e => e.id !== tempId) } : c
        ),
      }));
      return null;
    }
    const dbId = (data as { id: string }).id;
    setCasesByPatient(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map(c =>
        c.id === caseId
          ? { ...c, evolutions: c.evolutions.map(e => e.id === tempId ? { ...e, id: dbId } : e) }
          : c
      ),
    }));
    return dbId;
  }, [authUser?.id]);

  const updateEvolution = useCallback(async (patientId: string, caseId: string, evolution: Evolution): Promise<boolean> => {
    setCasesByPatient(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map(c =>
        c.id === caseId ? { ...c, evolutions: c.evolutions.map(e => e.id === evolution.id ? evolution : e) } : c
      ),
    }));
    if (!authUser) return false;
    const { error } = await supabase.from('evolutions').update({
      evolution_date: evolution.date,
      evolution_time: evolution.time || null,
      professional: evolution.professional || null,
      procedure: evolution.procedure || null,
      materials: evolution.materials || null,
      description: evolution.description || null,
      observations: evolution.observations || null,
      pain_level: typeof evolution.painLevel === 'number' ? evolution.painLevel : null,
      odor: evolution.odor || null,
      exudate_amount: evolution.exudateAmount || null,
      exudate_type: evolution.exudateType || null,
      exudate_color: evolution.exudateColor || null,
      tissue_types: (evolution.tissueTypes?.length ?? 0) > 0 ? evolution.tissueTypes : null,
      edge_types: (evolution.edgeTypes?.length ?? 0) > 0 ? evolution.edgeTypes : null,
      wound_length: typeof evolution.woundLength === 'number' ? evolution.woundLength : null,
      wound_width: typeof evolution.woundWidth === 'number' ? evolution.woundWidth : null,
      wound_depth: typeof evolution.woundDepth === 'number' ? evolution.woundDepth : null,
      has_infection_signs: evolution.hasInfectionSigns ?? false,
      inf_odor: evolution.infMalOlor ?? false,
      inf_redness: evolution.infEritema ?? false,
      inf_heat: evolution.infCalor ?? false,
      inf_swelling: evolution.infBiofilm ?? false,
      inf_purulent: evolution.infPurulenta ?? false,
      inf_fever: evolution.infDolorAumentado ?? false,
      body_temperature: typeof evolution.bodyTemperature === 'number' ? evolution.bodyTemperature : null,
      evolution_status: evolution.evolutionStatus || null,
      requires_medical_order: evolution.requiresMedicalOrder ?? false,
      medical_order: evolution.medicalOrder || null,
      closed_at: evolution.closedAt || null,
    }).eq('id', evolution.id).eq('user_id', authUser.id);
    if (error) {
      console.error('updateEvolution DB error', error);
      return false;
    }
    return true;
  }, [authUser?.id]);

  const deleteEvolution = useCallback((patientId: string, caseId: string, evolutionId: string) => {
    setCasesByPatient(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map(c =>
        c.id === caseId ? { ...c, evolutions: c.evolutions.filter(e => e.id !== evolutionId) } : c
      ),
    }));
  }, []);

  // ---- Compose turnos (rows -> app shape, deriving lifecycle status) ----
  const turnos: Turno[] = useMemo(() => {
    return turnoRows.map(row => {
      // A turno covers the patient's whole visit, so any evolution logged
      // for any of the patient's cases within the window fulfills it.
      const evolutions: CaseEvolutionInput[] = (casesByPatient[row.patient_id] || [])
        .flatMap(c => c.evolutions.map(e => ({ patient_id: row.patient_id, created_at: e.date })));
      const status = deriveTurnoStatus(
        {
          patient_id: row.patient_id,
          scheduled_date: row.scheduled_date,
          scheduled_time: row.scheduled_time,
          status: row.status,
        },
        evolutions,
      );
      return {
        id: row.id,
        caseId: row.case_id,
        patientId: row.patient_id,
        date: row.scheduled_date,
        time: normalizeAppointmentTime(row.scheduled_time),
        status,
        notes: row.notes ?? '',
      };
    });
  }, [turnoRows, casesByPatient]);

  // ---- Turno CRUD (backend) ----
  const cancelTurno = useCallback(async (id: string) => {
    if (!authUser) return;
    const { error } = await supabase
      .from('turnos')
      .update({ status: 'cancelado' })
      .eq('id', id)
      .eq('user_id', authUser.id);
    if (error) { console.error('cancelTurno error', error); return; }
    setTurnoRows(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelado' as const } : r));
  }, [authUser?.id]);

  const createTurno = useCallback(async (input: { caseId?: string; patientId: string; date: string; time?: string; notes?: string }): Promise<string | null> => {
    if (!authUser) return null;

    // Supersede any still-unresolved (programado/vencido) turno already
    // scheduled for this patient before creating a new one, so a patient
    // never accumulates duplicate/stale active turnos across multiple
    // evolution closes. completado/cancelado turnos are final and left untouched.
    const idsToSupersede = findTurnosToSupersede(turnos, input.patientId);
    for (const id of idsToSupersede) {
      try {
        await cancelTurno(id);
      } catch (err) {
        // Best-effort: don't block scheduling the new turno just because
        // superseding an old one failed, but surface it loudly.
        console.error('createTurno: failed to supersede existing turno', id, err);
      }
    }

    const insertable = {
      user_id: authUser.id,
      case_id: input.caseId ?? null,
      patient_id: input.patientId,
      scheduled_date: input.date,
      scheduled_time: input.time || null,
      notes: input.notes || null,
      status: 'programado' as const,
    };
    const { data, error } = await supabase
      .from('turnos')
      .insert(insertable)
      .select()
      .single();
    if (error) {
      console.error('createTurno error', error);
      return null;
    }
    setTurnoRows(prev => [data as TurnoRow, ...prev]);
    return (data as TurnoRow).id;
  }, [authUser?.id, turnos, cancelTurno]);

  const updateTurno = useCallback(async (turno: Turno) => {
    if (!authUser) return;
    const updatable = {
      scheduled_date: turno.date,
      scheduled_time: turno.time || null,
      notes: turno.notes || null,
    };
    const { error } = await supabase
      .from('turnos')
      .update(updatable)
      .eq('id', turno.id)
      .eq('user_id', authUser.id);
    if (error) { console.error('updateTurno error', error); return; }
    setTurnoRows(prev => prev.map(r => r.id === turno.id ? { ...r, ...updatable } as TurnoRow : r));
  }, [authUser?.id]);

  const deleteTurno = useCallback(async (id: string) => {
    const { error } = await supabase.from('turnos').delete().eq('id', id);
    if (error) { console.error('deleteTurno error', error); return; }
    setTurnoRows(prev => prev.filter(r => r.id !== id));
  }, []);

  // ---- Compose patients (rows + in-memory cases) ----
  const patients: Patient[] = useMemo(
    () => patientRows.map(row => rowToPatient(row, casesByPatient[row.id] || [])),
    [patientRows, casesByPatient]
  );

  return (
    <AppContext.Provider value={{
      isLoggedIn, authReady, currentUser, currentUserName,
      login, loginWithGoogle, logout, registerUser, setIsLoggedIn,

      patients, patientsLoading,
      addPatient, updatePatient, deletePatient,

      addCase, updateCase, deleteCase,
      addEvolution, appendEvolutionToState, updateEvolution, deleteEvolution,

      turnos, createTurno, updateTurno, cancelTurno, deleteTurno,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
