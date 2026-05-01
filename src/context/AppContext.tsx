import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Patient, WoundCase, Evolution, demoPatients } from '@/data/demoData';

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
  role: string | null;
  institution: string | null;
  license: string | null;
}

interface PatientRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  gender: string | null;
  dni: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  diagnosis: string | null;
  assigned_professional: string | null;
  observations: string | null;
  admission_date: string | null;
  control_interval_days: number | null;
}

// Mapping helpers between DB rows and the Patient shape used by the app
function rowToPatient(row: PatientRow, cases: WoundCase[]): Patient {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    age: row.age ?? 0,
    gender: row.gender ?? '',
    dni: row.dni ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    diagnosis: row.diagnosis ?? '',
    assignedProfessional: row.assigned_professional ?? '',
    observations: row.observations ?? '',
    admissionDate: row.admission_date ?? new Date().toISOString().split('T')[0],
    controlIntervalDays: row.control_interval_days ?? 7,
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
    gender: p.gender || null,
    dni: p.dni || null,
    phone: p.phone || null,
    email: p.email || null,
    address: p.address || null,
    diagnosis: p.diagnosis || null,
    assigned_professional: p.assignedProfessional || null,
    observations: p.observations || null,
    admission_date: p.admissionDate || null,
    control_interval_days: p.controlIntervalDays ?? 7,
  };
}

// ============================================================================

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'enfermero' | 'medico' | 'admin';
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
    role: 'enfermero' | 'medico' | 'admin';
    license?: string; institution?: string;
  }) => Promise<{ ok: boolean; message?: string; needsEmailConfirmation?: boolean }>;

  // Patients (synced with backend)
  patients: Patient[];
  patientsLoading: boolean;
  addPatient: (patient: Patient) => Promise<void>;
  updatePatient: (patient: Patient) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;

  // Cases & Evolutions (still local — Phase 2)
  addCase: (patientId: string, woundCase: WoundCase) => void;
  updateCase: (patientId: string, woundCase: WoundCase) => void;
  deleteCase: (patientId: string, caseId: string) => void;
  addEvolution: (patientId: string, caseId: string, evolution: Evolution) => void;
  updateEvolution: (patientId: string, caseId: string, evolution: Evolution) => void;
  deleteEvolution: (patientId: string, caseId: string, evolutionId: string) => void;

  // Compatibility shim
  setIsLoggedIn: (v: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [patientRows, setPatientRows] = useState<PatientRow[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);

  // In-memory case/evolution store keyed by patientId. Hydrated from seed data
  // for convenience while Phase 2 (cases backend) is pending.
  const [casesByPatient, setCasesByPatient] = useState<Record<string, WoundCase[]>>({});

  // ---- Auth bootstrap ----
  useEffect(() => {
    // 1) Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthUser(newSession?.user ?? null);
    });

    // 2) Then load existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthUser(data.session?.user ?? null);
      setAuthReady(true);
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // ---- Load profile + patients when auth user changes ----
  useEffect(() => {
    if (!authUser) {
      setProfile(null);
      setPatientRows([]);
      setCasesByPatient({});
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
              .order('evolution_date', { ascending: false });
            for (const e of (evoRows || []) as any[]) {
              const ev: Evolution = {
                id: e.id,
                date: e.evolution_date,
                time: e.evolution_time || '',
                professional: e.professional || '',
                description: e.description || '',
                procedure: e.procedure || '',
                materials: e.materials || '',
                healingFrequency: e.healing_frequency || '',
                observations: e.observations || '',
                nextControl: e.next_control || '',
                photos: [],
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
              size: c.size || undefined,
              depth: c.depth || undefined,
              exudate: c.exudate || undefined,
              infection: c.infection || undefined,
              pain: c.pain || undefined,
              treatment: c.treatment || undefined,
            };
            (casesById[c.patient_id] ||= []).push(wc);
          }
        }

        setCasesByPatient(prev => {
          const next = { ...prev };
          for (const row of (pats || []) as PatientRow[]) {
            if (next[row.id]) continue;
            if (casesById[row.id] && casesById[row.id].length > 0) {
              next[row.id] = casesById[row.id];
              continue;
            }
            const seedMatch = demoPatients.find(d =>
              d.firstName === row.first_name && d.lastName === row.last_name
            );
            next[row.id] = seedMatch
              ? seedMatch.cases.map(c => ({ ...c, patientId: row.id }))
              : [];
          }
          return next;
        });

        setPatientsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authUser]);

  const currentUser: CurrentUser | null = useMemo(() => {
    if (!authUser) return null;
    const role = (profile?.role as CurrentUser['role']) || 'enfermero';
    return {
      id: authUser.id,
      email: authUser.email || '',
      firstName: profile?.first_name || authUser.user_metadata?.first_name || '',
      lastName: profile?.last_name || authUser.user_metadata?.last_name || '',
      role,
      license: profile?.license || undefined,
      institution: profile?.institution || undefined,
    };
  }, [authUser, profile]);

  const isLoggedIn = !!session;
  const currentUserName = currentUser
    ? `${currentUser.role === 'medico' ? 'Dr.' : 'Lic.'} ${currentUser.firstName} ${currentUser.lastName}`.trim()
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
    if (!authUser) return;
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
      return;
    }
    setPatientRows(prev => [data as PatientRow, ...prev]);
    setCasesByPatient(prev => ({ ...prev, [(data as PatientRow).id]: [] }));
  }, [authUser]);

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
  }, [authUser]);

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

  // ---- Cases / Evolutions (in-memory, Phase 2) ----
  const addCase = useCallback((patientId: string, woundCase: WoundCase) => {
    setCasesByPatient(prev => ({ ...prev, [patientId]: [...(prev[patientId] || []), woundCase] }));
  }, []);
  const updateCase = useCallback((patientId: string, woundCase: WoundCase) => {
    setCasesByPatient(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map(c => c.id === woundCase.id ? woundCase : c),
    }));
  }, []);
  const deleteCase = useCallback((patientId: string, caseId: string) => {
    setCasesByPatient(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).filter(c => c.id !== caseId),
    }));
  }, []);
  const addEvolution = useCallback((patientId: string, caseId: string, evolution: Evolution) => {
    setCasesByPatient(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map(c =>
        c.id === caseId ? { ...c, evolutions: [evolution, ...c.evolutions] } : c
      ),
    }));
  }, []);
  const updateEvolution = useCallback((patientId: string, caseId: string, evolution: Evolution) => {
    setCasesByPatient(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map(c =>
        c.id === caseId ? { ...c, evolutions: c.evolutions.map(e => e.id === evolution.id ? evolution : e) } : c
      ),
    }));
  }, []);
  const deleteEvolution = useCallback((patientId: string, caseId: string, evolutionId: string) => {
    setCasesByPatient(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map(c =>
        c.id === caseId ? { ...c, evolutions: c.evolutions.filter(e => e.id !== evolutionId) } : c
      ),
    }));
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
      addEvolution, updateEvolution, deleteEvolution,
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
