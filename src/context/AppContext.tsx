import React, { createContext, useContext, useState, useCallback } from 'react';
import { Patient, WoundCase, Evolution, demoPatients } from '@/data/demoData';

interface AppContextType {
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  addPatient: (patient: Patient) => void;
  updatePatient: (patient: Patient) => void;
  deletePatient: (id: string) => void;
  addCase: (patientId: string, woundCase: WoundCase) => void;
  updateCase: (patientId: string, woundCase: WoundCase) => void;
  deleteCase: (patientId: string, caseId: string) => void;
  addEvolution: (patientId: string, caseId: string, evolution: Evolution) => void;
  updateEvolution: (patientId: string, caseId: string, evolution: Evolution) => void;
  deleteEvolution: (patientId: string, caseId: string, evolutionId: string) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
  currentUser: string;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(demoPatients);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const currentUser = 'Lic. María González';

  const addPatient = useCallback((patient: Patient) => {
    setPatients(prev => [...prev, patient]);
  }, []);

  const updatePatient = useCallback((patient: Patient) => {
    setPatients(prev => prev.map(p => p.id === patient.id ? patient : p));
  }, []);

  const deletePatient = useCallback((id: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
  }, []);

  const addCase = useCallback((patientId: string, woundCase: WoundCase) => {
    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, cases: [...p.cases, woundCase] } : p
    ));
  }, []);

  const updateCase = useCallback((patientId: string, woundCase: WoundCase) => {
    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, cases: p.cases.map(c => c.id === woundCase.id ? woundCase : c) } : p
    ));
  }, []);

  const deleteCase = useCallback((patientId: string, caseId: string) => {
    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, cases: p.cases.filter(c => c.id !== caseId) } : p
    ));
  }, []);

  const addEvolution = useCallback((patientId: string, caseId: string, evolution: Evolution) => {
    setPatients(prev => prev.map(p =>
      p.id === patientId ? {
        ...p,
        cases: p.cases.map(c =>
          c.id === caseId ? { ...c, evolutions: [evolution, ...c.evolutions] } : c
        )
      } : p
    ));
  }, []);

  const updateEvolution = useCallback((patientId: string, caseId: string, evolution: Evolution) => {
    setPatients(prev => prev.map(p =>
      p.id === patientId ? {
        ...p,
        cases: p.cases.map(c =>
          c.id === caseId ? { ...c, evolutions: c.evolutions.map(e => e.id === evolution.id ? evolution : e) } : c
        )
      } : p
    ));
  }, []);

  const deleteEvolution = useCallback((patientId: string, caseId: string, evolutionId: string) => {
    setPatients(prev => prev.map(p =>
      p.id === patientId ? {
        ...p,
        cases: p.cases.map(c =>
          c.id === caseId ? { ...c, evolutions: c.evolutions.filter(e => e.id !== evolutionId) } : c
        )
      } : p
    ));
  }, []);

  return (
    <AppContext.Provider value={{
      patients, setPatients, addPatient, updatePatient, deletePatient,
      addCase, updateCase, deleteCase,
      addEvolution, updateEvolution, deleteEvolution,
      isLoggedIn, setIsLoggedIn, currentUser,
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
