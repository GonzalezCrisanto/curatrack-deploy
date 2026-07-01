## Turnos Table — Task Checklist

Ordering rationale: DB schema must land before generated types; types before AppContext
(compile dependency); the pure `deriveTurnoStatus` helper before AppContext wires it in;
AppContext (state + CRUD) before any consuming page, since every page task depends on the
context contract (`createTurno`/`updateTurno`/`cancelTurno`/`deleteTurno`, `turnos[]`).
Strict TDD Mode is active (`npm test`, Vitest/jsdom) — the pure helper task is test-first;
page-level tasks pair implementation with their existing test files where present.

### 1. Database migration

- [x] 1.1 Append `turnos` DDL (table, RESTRICTIVE + permissive RLS policies, `updated_at`
      trigger, indexes) to `supabase/migrations/NUEVABD.sql`, exactly per design's Full DDL
      section. — *Satisfies: Standalone Turno Creation, Row-Level Security, Real Deletion
      Semantics (schema-level NOT NULL `case_id`, CHECK on `status`).*
- [ ] 1.2 Apply the migration to the real Supabase project and confirm it runs clean (no
      conflicting object names). — *Satisfies: all requirements (schema prerequisite).*
      OWNER: user (run manually against Supabase; not performed by this change's agent
      sessions — no remote DB credentials available in this environment).

  Dependency: none (first task). Blocks: 2, all subsequent tasks.

### 2. Regenerate Supabase types

- [x] 2.1 Regenerate `src/integrations/supabase/types.ts` against the migrated schema. —
      *Satisfies: schema prerequisite for typed `TurnoRow` in AppContext.* DEVIATION: hand-
      edited to add the `turnos` Row/Insert/Update/Relationships entry (column-for-column
      match to the DDL), instead of running `supabase gen types`, since no remote Supabase
      CLI login/credentials are available in this environment. Re-run `supabase gen types`
      for real once 1.2 is applied, to confirm the hand-written types match exactly.

  Dependency: 1. Blocks: 3.

### 3. `deriveTurnoStatus` pure helper (test-first)

- [x] 3.1 Write unit tests for `deriveTurnoStatus(turno, caseEvolutions, today)` in
      `src/test/appointments.test.ts` covering: cancelado short-circuit, completado within
      ±3 days (exact date, +2 days), NOT completado outside the window (falls through to
      vencido or programado per date), vencido when scheduled datetime has passed with no
      qualifying evolution, programado when nothing else applies. — *Satisfies:
      Auto-Transition to Completado, Auto-Transition to Vencido, Manual Cancellation (all
      scenarios in spec).* Later extended with 7 more tests for `findTurnosToSupersede`
      (dedup fix, see 4.10).
- [x] 3.2 Implement `deriveTurnoStatus` and export `COMPLETADO_WINDOW_DAYS = 3` as a named
      constant in `src/lib/appointments.ts`; make 3.1 pass. — *Satisfies: same as 3.1.*
- [x] 3.3 Remove retired helpers from `src/lib/appointments.ts`. — *Satisfies: Standalone
      Turno Creation (retires the decoy/marker mechanism that blocked it).* REVISED SCOPE
      (corrected after implementation, contradicts the original plan above): only
      `appendNextControlTimeMarker` (the marker *writer*) was actually dead code and was
      removed — its only caller (`NewCuration.tsx`'s defensive retry) was retired in 8.1.
      `extractNextControlTime`, `stripNextControlTimeMarker`, and `getNextControlTime` (the
      marker *readers*) are intentionally KEPT: they're still actively used by
      `AppContext.tsx` (row→app-shape mapping), `src/pages/Assistant.tsx`, and
      `src/lib/exportPdf.ts` to read/strip a legacy `[turno_hora:HH:MM]` marker that may
      still be embedded in the `observations` of historical evolutions saved before this
      change — removing them would break reading that old data. `normalizeAppointmentTime`
      and `formatNextControl` were kept as originally planned.

  Dependency: none functionally, but ordered after 2 so the module compiles against final
  types if it imports any. Blocks: 4 (AppContext consumes `deriveTurnoStatus` + the pruned
  export surface).

### 4. AppContext: turno state + CRUD

- [x] 4.1 Add `TurnoRow` (DB shape) and `Turno`/`TurnoStatus` (app shape) types per design's
      Interfaces/Contracts section. — *Satisfies: Standalone Turno Creation.*
- [x] 4.2 Add `turnoRows` state, load `turnos` (filtered by `patient_id IN patientIds`) in the
      same auth effect that loads patients/cases. — *Satisfies: Row-Level Security (RLS
      enforces the actual filtering; this is the read path that surfaces it).*
- [x] 4.3 Add a `turnos` memo mapping `turnoRows` → `Turno[]`, applying `deriveTurnoStatus`
      against each turno's case evolutions from `casesByPatient`. — *Satisfies:
      Auto-Transition to Completado, Auto-Transition to Vencido.*
- [x] 4.4 Implement `createTurno` (optimistic local update + insert, reconcile id from
      `.select().single()`, following the `addPatient` pattern). — *Satisfies: Standalone
      Turno Creation.*
- [x] 4.5 Implement `updateTurno` (same optimistic pattern). — *Satisfies: Manual
      Cancellation (supporting update path), general CRUD contract.*
- [x] 4.6 Implement `cancelTurno` (UPDATE `status='cancelado'`, Supabase call issued
      before/with local state mutation). — *Satisfies: Manual Cancellation.*
- [x] 4.7 Implement `deleteTurno` as a REAL `supabase.from('turnos').delete().eq('id', id)`
      call before/with local state mutation — explicitly do NOT replicate the
      `deleteEvolution` local-only no-op pattern. — *Satisfies: Real Deletion Semantics.*
- [x] 4.8 Stop writing the *decoy-evolution turno* pattern; do not touch the genuine
      "próximo control" write in evolution-close flows (that stays, per design's
      Migration/Rollout note). — *Satisfies: Standalone Turno Creation (decoy retirement).*
      RESOLVED across batches 5–8: decoy-evolution inserts removed from `Dashboard.tsx`
      (6.1) and `PatientDetail.tsx` (7.1). `extractNextControlTime`/`stripNextControlTimeMarker`
      remain imported in `AppContext.tsx` by design — see revised 3.3 note, they're
      legitimate read-compat for historical data, not dead code.
- [x] 4.9 Expose `turnos`, `createTurno`, `updateTurno`, `cancelTurno`, `deleteTurno` on the
      context value. — *Satisfies: all requirements (contract surface for consumers).*
- [x] 4.10 (Added post-verify) `createTurno` must not accumulate duplicate active turnos for
      the same case across repeated evolution closes. Added pure helper
      `findTurnosToSupersede(existingTurnos, caseId)` in `src/lib/appointments.ts`
      (test-first, 7 new tests) returning ids of turnos for that case still `programado`/
      `vencido` (unresolved); `createTurno` now cancels each of those via `cancelTurno`
      before inserting the new row. `completado`/`cancelado` turnos are final and untouched.
      Transparent to all callers (`NewCuration.tsx`, `Dashboard.tsx`, `PatientDetail.tsx`) —
      no caller changes needed. — *Satisfies: Standalone Turno Creation (data integrity:
      exactly one active turno per case at a time).*

  Dependency: 2, 3. Blocks: 5, 6, 7, 8.

### 5. `Agenda.tsx`

- [x] 5.1 Read/render from `turnos` (via `AppContext`) instead of deriving appointments from
      `patients → cases → evolutions`. Remove the now-dead `extractNextControlTime`/
      `stripNextControlTimeMarker` import (design flags `Agenda.tsx` L7). — *Satisfies:
      Standalone Turno Creation, Auto-Transition to Completado, Auto-Transition to Vencido
      (all four lifecycle states must render correctly here).*
- [x] 5.2 Update/add tests for `Agenda.tsx` covering the four rendered statuses if a test
      file exists for this page; add one if the project's test coverage convention expects
      it for page-level components with derived data. — *Satisfies: same as 5.1 (regression
      safety net).* No existing page-level test file for `Agenda.tsx` found in `src/test/`
      (only `appointments.test.ts` unit-tests the pure helper); per batch instructions,
      relied on already-tested `deriveTurnoStatus` + `tsc`/full-suite verification instead of
      adding a new page test, consistent with the project's page-component testing
      convention (manual/E2E, not Vitest unit tests for pages).

  Dependency: 4. Blocks: none.

### 6. `Dashboard.tsx`

- [x] 6.1 "Nuevo turno" action calls `createTurno` instead of inserting a decoy `evolutions`
      row (`description: 'Turno programado'`). Remove the decoy-evolution insert code
      entirely. — *Satisfies: Standalone Turno Creation.* Also re-pointed all other
      evolution-derived appointment scans in this file (`todayAgenda`, `allAppointments`,
      `agendaAppointments`, `controlsByDate`, `upcomingControls`/`overdueControls` KPIs) to
      read from `turnos` instead of `patients→cases→evolutions.nextControl`.
- [x] 6.2 Gap closed (post-verify): the two remaining direct-evolution reads (`alerts`'
      "control vencido" check, `professionalPatientCards`' `hasTodayControl` check) now use
      `activeTurnos` instead of `c.evolutions.some(e => e.nextControl ...)`.

  Dependency: 4. Blocks: none.

### 7. `PatientDetail.tsx`

- [x] 7.1 `handleSaveAppointment` calls `createTurno` instead of the decoy-evolution insert
      path. — *Satisfies: Standalone Turno Creation.* Also re-pointed `apptConflicts` and the
      "Calendario de Controles" widget (`appointmentsByCase`, `otherPatientsAppointments`,
      suggestion-anchor `futureControls`, and both `takenThatDay` slot-picker computations) from
      evolution-derived `nextControl` scanning to `turnos`.

  Dependency: 4. Blocks: none.

### 8. `NewCuration.tsx`

- [x] 8.1 Retire the `[turno_hora:HH:MM]` marker fallback write; the "próximo control" field
      on a real evolution close keeps writing `next_control`/`next_control_time` directly
      (no marker). — *Satisfies: Standalone Turno Creation (legacy marker retirement).*
- [x] 8.2 Gap closed (post-verify): the evolution-close flow now ALSO calls `createTurno`
      after a successful `next_control` write, making `turnos` the single source of truth for
      scheduling. `evolutions.next_control`/`next_control_time` remain untouched as the
      clinical record's own field. — *Satisfies: Standalone Turno Creation (Agenda/Dashboard
      consistency).*

  Dependency: 4 (for consistency of the shared helper surface; no direct data dependency
  beyond helper removal in 3.3). Blocks: none.

---

## Review Workload Forecast

| File / group | Estimated changed lines | Notes |
|---|---|---|
| `supabase/migrations/NUEVABD.sql` | ~55 | Additive DDL block, low risk |
| `src/integrations/supabase/types.ts` | ~30–50 | Auto-generated diff, not hand-reviewed line-by-line but counts toward PR size |
| `src/context/AppContext.tsx` | ~110–150 | New state, memo, 4 CRUD functions, import/write cleanup |
| `src/lib/appointments.ts` + new/updated test file | ~90–130 | New helper + tests + 4 helper removals |
| `src/pages/Agenda.tsx` | ~80–120 | Data-source rewrite, likely largest page diff |
| `src/pages/Dashboard.tsx` | ~30–50 | Remove decoy insert, wire `createTurno` |
| `src/pages/PatientDetail.tsx` | ~30–50 | Remove decoy insert, wire `createTurno` |
| `src/pages/NewCuration.tsx` | ~15–30 | Remove marker fallback only |
| **Total estimate** | **~440–635 lines** | Exceeds the 400-line PR budget |

**Conclusion: 400-line budget risk = High.** Estimated total materially exceeds 400 lines
even at the low end of the range, confirming the proposal's own risk flag ("Blast radius 8+
files exceeds 400-line PR budget", Likelihood: High). **Chained/stacked PRs recommended:
Yes.** **Decision needed before sdd-apply: Yes** — `delivery_strategy` is `ask-on-risk` and
no `chain_strategy` has been chosen yet; the orchestrator must stop and ask the user to pick
between chained/stacked PRs (and which chain strategy — `stacked-to-main` vs
`feature-branch-chain`) or proceed under an explicit `size:exception`, before launching
`sdd-apply`.

Suggested natural split points if chaining is chosen (in dependency order, matching the task
groups above): (1) migration + types regen, (2) `appointments.ts` helper + tests, (3)
`AppContext.tsx` state/CRUD, (4) consuming pages (`Agenda.tsx`, `Dashboard.tsx`,
`PatientDetail.tsx`, `NewCuration.tsx`) — this last group could itself split further if a
single PR is still too large.
