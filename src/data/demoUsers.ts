// Demo accounts, teams and patient shares for the localStorage-based demo.
// All passwords are demo-only and live in plain text on purpose: this is NOT
// production auth — it is an in-browser sandbox so clients can test the
// multi-user + sharing flows without a backend.

export type ShareRole = 'viewer' | 'collaborator' | 'co_owner';

export interface DemoUser {
  id: string;            // stable id, also used as user_id on patients/cases/etc.
  email: string;
  password: string;      // demo only
  firstName: string;
  lastName: string;
  role: 'enfermero' | 'medico' | 'admin';
  license?: string;
  institution?: string;
  teamId?: string;       // belongs to one team (clinic)
}

export interface DemoTeam {
  id: string;
  name: string;
}

export interface PatientShare {
  patientId: string;
  userId: string;        // invited user
  role: ShareRole;
  invitedBy: string;     // user_id of the inviter (owner)
  invitedAt: string;     // ISO date
}

export const demoTeams: DemoTeam[] = [
  { id: 't-sanmartin', name: 'Clínica San Martín' },
];

export const demoUsers: DemoUser[] = [
  {
    id: 'u-maria',
    email: 'maria@curatrack.demo',
    password: 'demo1234',
    firstName: 'María',
    lastName: 'González',
    role: 'enfermero',
    license: 'M.N. 45.231',
    institution: 'Clínica San Martín',
    teamId: 't-sanmartin',
  },
  {
    id: 'u-juan',
    email: 'juan@curatrack.demo',
    password: 'demo1234',
    firstName: 'Juan',
    lastName: 'Pérez',
    role: 'medico',
    license: 'M.P. 12.987',
    institution: 'Clínica San Martín',
    teamId: 't-sanmartin',
  },
  {
    id: 'u-ana',
    email: 'ana@curatrack.demo',
    password: 'demo1234',
    firstName: 'Ana',
    lastName: 'Rodríguez',
    role: 'enfermero',
    license: 'M.N. 67.450',
    institution: 'Centro de Salud Belgrano',
    // No team — independent professional. Only sees what is shared with her.
  },
];

// Owners: which user "owns" each demo patient (initial assignment).
// Patient ids come from src/data/demoData.ts.
export const demoPatientOwners: Record<string, string> = {
  p1: 'u-maria',
  p2: 'u-maria',
  p4: 'u-maria',
  p3: 'u-juan',
  p5: 'u-juan',
  p6: 'u-ana',
};

// Initial 1-to-1 shares (independent of team membership).
// Example: María invites Ana to collaborate on patient p1.
export const demoPatientShares: PatientShare[] = [
  {
    patientId: 'p1',
    userId: 'u-ana',
    role: 'collaborator',
    invitedBy: 'u-maria',
    invitedAt: '2026-04-01',
  },
];

export const ROLE_LABEL: Record<ShareRole, string> = {
  viewer: 'Solo lectura',
  collaborator: 'Colaborador (puede agregar evoluciones)',
  co_owner: 'Co-dueño (acceso total)',
};

export const ROLE_LABEL_SHORT: Record<ShareRole, string> = {
  viewer: 'Lectura',
  collaborator: 'Colaborador',
  co_owner: 'Co-dueño',
};
