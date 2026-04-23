import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Patient, WoundCase, Evolution, demoPatients } from '@/data/demoData';
import {
  DemoUser, DemoTeam, PatientShare, ShareRole,
  demoUsers, demoTeams, demoPatientOwners, demoPatientShares,
} from '@/data/demoUsers';

// ---------- Storage keys ----------
const LS_USERS = 'curatrack:users';
const LS_TEAMS = 'curatrack:teams';
const LS_PATIENTS = 'curatrack:patients';        // Patient[] + ownerId map embedded
const LS_OWNERS = 'curatrack:patientOwners';     // Record<patientId, userId>
const LS_SHARES = 'curatrack:patientShares';     // PatientShare[]
const LS_SESSION = 'curatrack:sessionUserId';

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}
function saveLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ---------- Access helpers ----------
export interface PatientAccess {
  ownerId: string;
  // The current user's effective role on this patient
  effectiveRole: ShareRole | 'owner';
  canEdit: boolean;
  canShare: boolean;
  canDelete: boolean;
}

interface AppContextType {
  // Auth
  isLoggedIn: boolean;
  currentUser: DemoUser | null;
  currentUserName: string;
  allUsers: DemoUser[];
  teams: DemoTeam[];
  login: (email: string, password: string) => { ok: boolean; message?: string };
  logout: () => void;
  registerUser: (data: Omit<DemoUser, 'id'>) => { ok: boolean; message?: string };

  // Data (already filtered by access for the current user)
  patients: Patient[];
  // Underlying maps (for sharing UI)
  patientOwners: Record<string, string>;
  patientShares: PatientShare[];

  // Patient CRUD (auto-assigns owner = current user on create)
  addPatient: (patient: Patient) => void;
  updatePatient: (patient: Patient) => void;
  deletePatient: (id: string) => void;

  // Cases & Evolutions
  addCase: (patientId: string, woundCase: WoundCase) => void;
  updateCase: (patientId: string, woundCase: WoundCase) => void;
  deleteCase: (patientId: string, caseId: string) => void;
  addEvolution: (patientId: string, caseId: string, evolution: Evolution) => void;
  updateEvolution: (patientId: string, caseId: string, evolution: Evolution) => void;
  deleteEvolution: (patientId: string, caseId: string, evolutionId: string) => void;

  // Sharing
  getPatientAccess: (patientId: string) => PatientAccess | null;
  sharePatient: (patientId: string, email: string, role: ShareRole) => { ok: boolean; message?: string };
  updateShareRole: (patientId: string, userId: string, role: ShareRole) => void;
  revokeShare: (patientId: string, userId: string) => void;
  getPatientCollaborators: (patientId: string) => Array<{ user: DemoUser; role: ShareRole | 'owner'; via: 'owner' | 'team' | 'share' }>;

  // Compatibility shim
  setIsLoggedIn: (v: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // ----- Persistent state (loaded once) -----
  const [allUsers, setAllUsers] = useState<DemoUser[]>(() => loadLS(LS_USERS, demoUsers));
  const [teams] = useState<DemoTeam[]>(() => loadLS(LS_TEAMS, demoTeams));
  const [allPatients, setAllPatients] = useState<Patient[]>(() => loadLS(LS_PATIENTS, demoPatients));
  const [patientOwners, setPatientOwners] = useState<Record<string, string>>(() => loadLS(LS_OWNERS, demoPatientOwners));
  const [patientShares, setPatientShares] = useState<PatientShare[]>(() => loadLS(LS_SHARES, demoPatientShares));

  const [sessionUserId, setSessionUserId] = useState<string | null>(() => loadLS<string | null>(LS_SESSION, null));

  // Persist on changes
  useEffect(() => { saveLS(LS_USERS, allUsers); }, [allUsers]);
  useEffect(() => { saveLS(LS_TEAMS, teams); }, [teams]);
  useEffect(() => { saveLS(LS_PATIENTS, allPatients); }, [allPatients]);
  useEffect(() => { saveLS(LS_OWNERS, patientOwners); }, [patientOwners]);
  useEffect(() => { saveLS(LS_SHARES, patientShares); }, [patientShares]);
  useEffect(() => { saveLS(LS_SESSION, sessionUserId); }, [sessionUserId]);

  const currentUser = useMemo(
    () => allUsers.find(u => u.id === sessionUserId) ?? null,
    [allUsers, sessionUserId]
  );
  const isLoggedIn = currentUser !== null;
  const currentUserName = currentUser
    ? `${currentUser.role === 'medico' ? 'Dr.' : 'Lic.'} ${currentUser.firstName} ${currentUser.lastName}`
    : '';

  // ----- Access helpers -----
  const getPatientAccess = useCallback((patientId: string): PatientAccess | null => {
    if (!currentUser) return null;
    const ownerId = patientOwners[patientId];
    if (!ownerId) return null;

    if (ownerId === currentUser.id) {
      return { ownerId, effectiveRole: 'owner', canEdit: true, canShare: true, canDelete: true };
    }

    // Team access: if owner and current user share a team, treat as collaborator
    const owner = allUsers.find(u => u.id === ownerId);
    if (owner?.teamId && currentUser.teamId && owner.teamId === currentUser.teamId) {
      return { ownerId, effectiveRole: 'collaborator', canEdit: true, canShare: false, canDelete: false };
    }

    // Direct share
    const share = patientShares.find(s => s.patientId === patientId && s.userId === currentUser.id);
    if (share) {
      const canEdit = share.role !== 'viewer';
      const canShare = share.role === 'co_owner';
      const canDelete = share.role === 'co_owner';
      return { ownerId, effectiveRole: share.role, canEdit, canShare, canDelete };
    }

    return null;
  }, [currentUser, patientOwners, patientShares, allUsers]);

  // ----- Filtered patients view (only what the current user can see) -----
  const patients = useMemo(() => {
    if (!currentUser) return [];
    return allPatients.filter(p => getPatientAccess(p.id) !== null);
  }, [allPatients, currentUser, getPatientAccess]);

  // ----- Auth -----
  const login: AppContextType['login'] = (email, password) => {
    const u = allUsers.find(x => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return { ok: false, message: 'No existe una cuenta con ese email.' };
    if (u.password !== password) return { ok: false, message: 'Contraseña incorrecta.' };
    setSessionUserId(u.id);
    return { ok: true };
  };

  const logout = () => setSessionUserId(null);

  const registerUser: AppContextType['registerUser'] = (data) => {
    if (allUsers.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { ok: false, message: 'Ya existe una cuenta con ese email.' };
    }
    const newUser: DemoUser = { ...data, id: `u-${Date.now()}` };
    setAllUsers(prev => [...prev, newUser]);
    setSessionUserId(newUser.id);
    return { ok: true };
  };

  // Compat shim for legacy callers (Login.tsx etc.) — only allows logout
  const setIsLoggedIn = (v: boolean) => { if (!v) logout(); };

  // ----- Patient CRUD -----
  const addPatient = useCallback((patient: Patient) => {
    if (!currentUser) return;
    setAllPatients(prev => [...prev, patient]);
    setPatientOwners(prev => ({ ...prev, [patient.id]: currentUser.id }));
  }, [currentUser]);

  const updatePatient = useCallback((patient: Patient) => {
    setAllPatients(prev => prev.map(p => p.id === patient.id ? patient : p));
  }, []);

  const deletePatient = useCallback((id: string) => {
    setAllPatients(prev => prev.filter(p => p.id !== id));
    setPatientOwners(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPatientShares(prev => prev.filter(s => s.patientId !== id));
  }, []);

  // ----- Cases / Evolutions -----
  const addCase = useCallback((patientId: string, woundCase: WoundCase) => {
    setAllPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, cases: [...p.cases, woundCase] } : p
    ));
  }, []);

  const updateCase = useCallback((patientId: string, woundCase: WoundCase) => {
    setAllPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, cases: p.cases.map(c => c.id === woundCase.id ? woundCase : c) } : p
    ));
  }, []);

  const deleteCase = useCallback((patientId: string, caseId: string) => {
    setAllPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, cases: p.cases.filter(c => c.id !== caseId) } : p
    ));
  }, []);

  const addEvolution = useCallback((patientId: string, caseId: string, evolution: Evolution) => {
    setAllPatients(prev => prev.map(p =>
      p.id === patientId ? {
        ...p,
        cases: p.cases.map(c =>
          c.id === caseId ? { ...c, evolutions: [evolution, ...c.evolutions] } : c
        ),
      } : p
    ));
  }, []);

  const updateEvolution = useCallback((patientId: string, caseId: string, evolution: Evolution) => {
    setAllPatients(prev => prev.map(p =>
      p.id === patientId ? {
        ...p,
        cases: p.cases.map(c =>
          c.id === caseId ? { ...c, evolutions: c.evolutions.map(e => e.id === evolution.id ? evolution : e) } : c
        ),
      } : p
    ));
  }, []);

  const deleteEvolution = useCallback((patientId: string, caseId: string, evolutionId: string) => {
    setAllPatients(prev => prev.map(p =>
      p.id === patientId ? {
        ...p,
        cases: p.cases.map(c =>
          c.id === caseId ? { ...c, evolutions: c.evolutions.filter(e => e.id !== evolutionId) } : c
        ),
      } : p
    ));
  }, []);

  // ----- Sharing -----
  const sharePatient: AppContextType['sharePatient'] = (patientId, email, role) => {
    if (!currentUser) return { ok: false, message: 'No hay sesión activa.' };
    const target = allUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!target) return { ok: false, message: 'No existe ningún usuario registrado con ese email.' };
    if (target.id === currentUser.id) return { ok: false, message: 'No podés compartir un paciente con vos mismo.' };
    if (patientOwners[patientId] === target.id) return { ok: false, message: 'Ese profesional ya es el dueño del paciente.' };

    setPatientShares(prev => {
      const existing = prev.find(s => s.patientId === patientId && s.userId === target.id);
      if (existing) {
        return prev.map(s => s === existing ? { ...s, role } : s);
      }
      return [...prev, {
        patientId,
        userId: target.id,
        role,
        invitedBy: currentUser.id,
        invitedAt: new Date().toISOString().split('T')[0],
      }];
    });
    return { ok: true };
  };

  const updateShareRole = (patientId: string, userId: string, role: ShareRole) => {
    setPatientShares(prev => prev.map(s =>
      s.patientId === patientId && s.userId === userId ? { ...s, role } : s
    ));
  };

  const revokeShare = (patientId: string, userId: string) => {
    setPatientShares(prev => prev.filter(s => !(s.patientId === patientId && s.userId === userId)));
  };

  const getPatientCollaborators: AppContextType['getPatientCollaborators'] = (patientId) => {
    const ownerId = patientOwners[patientId];
    if (!ownerId) return [];
    const owner = allUsers.find(u => u.id === ownerId);
    const result: Array<{ user: DemoUser; role: ShareRole | 'owner'; via: 'owner' | 'team' | 'share' }> = [];
    if (owner) result.push({ user: owner, role: 'owner', via: 'owner' });

    // Team mates
    if (owner?.teamId) {
      allUsers.forEach(u => {
        if (u.id !== ownerId && u.teamId === owner.teamId) {
          result.push({ user: u, role: 'collaborator', via: 'team' });
        }
      });
    }

    // Direct shares
    patientShares
      .filter(s => s.patientId === patientId)
      .forEach(s => {
        if (result.some(r => r.user.id === s.userId)) return; // dedup over team
        const u = allUsers.find(x => x.id === s.userId);
        if (u) result.push({ user: u, role: s.role, via: 'share' });
      });

    return result;
  };

  return (
    <AppContext.Provider value={{
      isLoggedIn, currentUser, currentUserName, allUsers, teams,
      login, logout, registerUser, setIsLoggedIn,

      patients, patientOwners, patientShares,

      addPatient, updatePatient, deletePatient,
      addCase, updateCase, deleteCase,
      addEvolution, updateEvolution, deleteEvolution,

      getPatientAccess, sharePatient, updateShareRole, revokeShare, getPatientCollaborators,
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
