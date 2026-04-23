---
name: Demo Multi-User & Patient Sharing
description: localStorage-backed auth with 3 demo accounts, team membership, and per-patient shares with roles (viewer/collaborator/co_owner)
type: feature
---

# Demo multi-user model (localStorage)

The app simulates Supabase RLS + sharing entirely in the browser so clients can
test the multi-user flow without a backend.

## Storage keys (all in `localStorage`)
- `curatrack:users` — `DemoUser[]`
- `curatrack:teams` — `DemoTeam[]`
- `curatrack:patients` — `Patient[]` (full data)
- `curatrack:patientOwners` — `Record<patientId, userId>`
- `curatrack:patientShares` — `PatientShare[]`
- `curatrack:sessionUserId` — currently logged-in user id

## Seed accounts (password = `demo1234`)
| Email | Name | Role | Team | Owns |
|---|---|---|---|---|
| maria@curatrack.demo | Lic. María González | enfermero | Clínica San Martín | p1, p2, p4 |
| juan@curatrack.demo | Dr. Juan Pérez | medico | Clínica San Martín | p3, p5 |
| ana@curatrack.demo | Lic. Ana Rodríguez | enfermero | (independiente) | p6 |

María y Juan ven todo entre ellos via **team**. Ana ve p6 (suya) + p1 (compartido por María como `collaborator`).

## Access rules (in `getPatientAccess`)
1. owner → full access (edit, share, delete).
2. same team as owner → `collaborator` (edit, no share, no delete).
3. direct share row → role from share (`viewer` | `collaborator` | `co_owner`). Only `co_owner` can re-share/delete.
4. otherwise → no access; patient is filtered out of `patients` list.

## Key files
- `src/data/demoUsers.ts` — seed users, teams, owners, shares + `ShareRole` type and labels.
- `src/context/AppContext.tsx` — auth (login/logout/registerUser), filtered `patients`, sharing helpers (`sharePatient`, `revokeShare`, `updateShareRole`, `getPatientCollaborators`).
- `src/components/SharePatientDialog.tsx` — invite-by-email modal, role picker, collaborator list.
- `src/pages/PatientDetail.tsx` — "Compartir" button + ownership/shared badge in patient header.
- `src/pages/Login.tsx` — demo accounts picker.

## When migrating to Supabase
The local model maps 1:1 to a future schema:
- `teams` + `team_members` tables.
- `patient_shares (patient_id, user_id, role, invited_by, invited_at)`.
- `can_access_patient(_user_id, _patient_id)` security-definer fn for RLS.
- Rewrite RLS on `patients`, `wound_cases`, `evolutions`, `photos` to allow if owner OR same-team OR has share.
