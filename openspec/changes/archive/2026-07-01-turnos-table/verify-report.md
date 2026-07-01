# Verification Report: turnos-table

**Mode**: full artifact verification (proposal + design + spec + tasks + apply-progress)
**Verdict**: PASS WITH WARNINGS

## Task Completeness

| # | Task | tasks.md checkbox | Actual evidence |
|---|------|---|---|
| 1.1/1.2 | Migration DDL + apply | unchecked | DDL present in NUEVABD.sql:418-459, matches design exactly. "Apply to dev Supabase" intentionally not run (user will run separately per given context) - not a defect. |
| 2.1 | Regenerate types | unchecked | types.ts:1086-1139 turnos entry present, matches DDL column-for-column. |
| 3.1/3.2 | deriveTurnoStatus + tests | unchecked | Implemented in appointments.ts:34-63; 13 passing tests in appointments.test.ts including exact-day, +2d, +3d/-3d boundary (inclusive), +4d outside-window, cancelado-sticky (vs completado and vencido), completado-precedence-over-vencido, cross-case isolation. |
| 3.3 | Remove 4 legacy helpers | unchecked | Only appendNextControlTimeMarker removed. extractNextControlTime, stripNextControlTimeMarker, getNextControlTime intentionally KEPT - still consumed by AppContext.tsx, Assistant.tsx, exportPdf.ts for legacy marker backward-compat. Confirmed via grep. |
| 4.1-4.7, 4.9 | AppContext CRUD | checked | Verified: createTurno/updateTurno/cancelTurno/deleteTurno all present; deleteTurno issues real supabase.from(turnos).delete().eq(id, id) before local state mutation - does NOT replicate the deleteEvolution no-op bug. |
| 4.8 | Stop decoy writes | unchecked, marked DEFERRED | Confirmed complete: no "Turno programado" decoy pattern remains in Dashboard.tsx or PatientDetail.tsx (both call createTurno directly). |
| 5.1/5.2 | Agenda.tsx | checked | Confirmed: no residual nextControl/marker reads; renders from turnos. |
| 6.1 | Dashboard.tsx | checked | KPIs/calendar/todayAgenda/allAppointments confirmed re-pointed to turnos. See WARNING below re: alerts/professionalPatientCards. |
| 7.1 | PatientDetail.tsx | checked | handleSaveAppointment calls createTurno; no decoy pattern remains. |
| 8.1 | NewCuration.tsx | checked | Marker fallback removed; genuine evolutions.next_control* writes correctly retained (out of scope, per design). |

## Spec Compliance Matrix

| Requirement | Status | Evidence |
|---|---|---|
| Standalone Turno Creation | PASS | createTurno inserts directly into turnos, no evolution row created; case_id NOT NULL FK enforced in DDL. |
| Auto-Transition to Completado (exact day, +/-3d inclusive, outside window, precedence over vencido) | PASS | All scenarios covered by passing unit tests on deriveTurnoStatus. |
| Auto-Transition to Vencido (on-read, no cron) | PASS | Same function; tested. |
| Manual Cancellation (sticky against completado/vencido) | PASS | cancelado short-circuits at top of deriveTurnoStatus; tested both directions. |
| Row-Level Security (RESTRICTIVE sponsor-deny + owner/admin SELECT + owner-only write) | PASS (DDL-level) | DDL policies mirror evolutions/wound_cases house style exactly; not exercised by an integration test against a live DB (migration not yet applied - expected, per given context). |
| Real Deletion Semantics | PASS | deleteTurno issues .delete() before local state update. |

## Correctness / Design Coherence

- DDL matches design.md's Full DDL section byte-for-byte (columns, CHECK values, RLS policy names/logic, trigger, indexes).
- types.ts hand-added turnos entry matches DDL column-for-column (types/nullability all correct).
- WARNING - spec/design terminology drift: spec.md's Auto-Transition-to-Completado requirement and its scenarios say the window check uses the evolution's created_at date. design.md's Architecture Decision section actually specifies evolution_date, and the shipped code (AppContext.tsx:711-713) feeds deriveTurnoStatus the evolution's clinical evolution_date (DB column), not the DB row's insertion created_at timestamp. This matches design intent (the clinically meaningful date, not insertion time) but the spec's literal wording is inconsistent with both design and implementation. Not a functional bug - recommend correcting spec.md wording before archive.
- WARNING - Dashboard.tsx incomplete migration for two widgets: task 6.1 claims "re-pointed all other evolution-derived appointment scans" to turnos, and the KPIs/calendar/agenda lists are indeed correctly re-pointed. However, alerts (line 231, "control vencido" check via e.nextControl < today) and professionalPatientCards (line 303, e.nextControl === todayIso) still read the legacy evolutions.nextControl field directly, independent of the new turnos-derived vencido/programado states. A standalone turno created with no evolution will not surface in these two widgets even if overdue. This is legacy-read-only (allowed per design's "stays readable during transition"), so not a hard regression, but it is an undocumented gap versus the task's stated scope, and produces two independent, potentially divergent overdue-detection mechanisms on the same page.

## Build / Test Evidence

- npx tsc --noEmit: clean, zero errors.
- npm test: 112/112 tests passed across 8 files (including 13/13 in appointments.test.ts), no regressions.

## Success Criteria (proposal.md)

- [x] Standalone turno creates with no evolutions row - confirmed in AppContext.createTurno.
- [~] Decoy-evolution hack and [turno_hora] marker fully removed - decoy fully removed; marker write path (appendNextControlTimeMarker) removed; 3 marker read/strip helpers intentionally kept for legacy data compat (acceptable, but proposal's "fully removed" wording is now inaccurate and should be caveated).
- [x] All four lifecycle states resolve correctly (auto + manual) - verified via passing unit tests.
- [x] Sponsors denied; owners see only their turnos - RLS DDL correct; not exercised against a live DB yet (expected).
- [x] Agenda/Dashboard read from turnos - Agenda fully migrated; Dashboard KPIs/calendar migrated, with the alerts/professionalPatientCards gap noted above.

## Issues

### CRITICAL
None.

### WARNING
1. tasks.md checkboxes for 1.1, 1.2, 2.1, 3.1, 3.2, 3.3 are unchecked despite the underlying work being verifiably complete (or intentionally partial, in 3.3's case) - the checklist file is out of sync with reality and should be updated before archive so the artifact trail is trustworthy.
2. Spec/design terminology drift on created_at vs evolution_date for the completado window (see above) - recommend correcting spec.md wording.
3. Dashboard.tsx alerts and professionalPatientCards widgets still read legacy evolutions.nextControl directly rather than turnos, creating a second, divergent overdue-detection path not covered by the task's stated re-pointing scope.
4. Proposal Success Criteria item "Decoy-evolution hack and [turno_hora] marker fully removed" is only true for the decoy pattern and the marker write path; three marker read helpers remain by design for legacy-data compatibility - wording should be caveated, not treated as a discrepancy in itself.

### SUGGESTION
- Consider a follow-up integration/RLS test (e.g. via a local Supabase test harness) once the migration is actually applied, to close the gap between "RLS policy DDL looks correct" and "RLS behavior verified at runtime."

## Final Verdict

**PASS WITH WARNINGS** - no CRITICAL blockers. Core turnos lifecycle, CRUD, RLS DDL, and page wiring are correctly implemented and fully covered by passing tests and a clean type-check. Recommend updating tasks.md checkboxes and the two documentation/scope items above before archive; the Dashboard widget gap is a minor follow-up, not a release blocker.

---

## Re-Verify Pass (post fix-batch closing WARNING #3 + single-source-of-truth gap)

**Scope**: `NewCuration.tsx` evolution-close now also creates a linked `turno`; `Dashboard.tsx`'s `alerts`/`professionalPatientCards` re-pointed to `activeTurnos`.

### 1. NewCuration.tsx createTurno wiring — CONFIRMED CORRECT
`saveEvolution` (NewCuration.tsx:426-509): the `createTurno` call is placed AFTER the evolution insert succeeds (`evoErr` checked, `appendEvolutionToState` already called), guarded by `if (evo.nextControl)`, uses `caseId: wcase.id` / `patientId: patient.id` correctly. `createTurno` (AppContext.tsx:651-673) catches its own Supabase error internally and returns `null` — it never throws — so a turno-creation failure cannot roll back or block the evolution save. On `null` return, `NewCuration.tsx` shows a non-blocking destructive toast ("Evolución guardada, pero no se pudo generar el turno") and continues to the success toast. This matches the required semantics: evolution save is authoritative, turno creation is best-effort.

### 2. Dashboard.tsx hook correctness — CONFIRMED CORRECT
`activeTurnos = useMemo(() => turnos.filter(t => t.status !== 'cancelado'), [turnos])` (line 178). `alerts` memo depends on `[casesWithPatient, today, activeTurnos]` (line 276) and its body reads `activeTurnos.some((t) => t.caseId === c.caseId && t.status === 'vencido')` (line 231). `professionalPatientCards` memo depends on `[patients, activeTurnos]` (line 340) and reads `activeTurnos.some((t) => t.caseId === c.id && t.date === todayIso)` (line 303). Both dependency arrays correctly include `activeTurnos` — no stale-closure risk.

### 3. Duplicate-turno-on-re-save — NEW WARNING (genuine gap, not out of scope by any artifact)
Checked `design.md`/`spec.md`/`proposal.md` for any dedup requirement — none exists. Checked whether an edit-evolution flow exists that could resave the same evolution's `next_control` repeatedly: no `updateEvolution`/edit-evolution UI was found (`CaseDetail.tsx`'s `next_control` reference is read-only, feeding an AI-assistant JSON export, not a resave path). So the literal "edit and re-save the same evolution multiple times" scenario does not exist today.

However, a related and more realistic duplicate risk DOES exist and is unaddressed: `NewCuration.tsx`'s `createTurno` call has no check against existing active (`programado`) turnos for the same `case_id`/date before inserting. If a professional closes a second curación for the same case and sets a próximo control landing on/near a date that already has a pending turno (e.g., rescheduling), a second `turnos` row is created rather than updating the existing one — resulting in two concurrent `programado` turnos for the same case. Neither `design.md` (Architecture Decisions) nor `spec.md` (Requirements) mention any uniqueness constraint or upsert-by-case-and-window rule, and no DB constraint (unique index) prevents it. This is a genuine scope gap, not a silently-accepted tradeoff — flagging as WARNING, not dismissing.

### 4. Status of prior warnings
- **WARNING #1** (tasks.md checkboxes 1.1/1.2/2.1/3.1/3.2/3.3 unchecked despite complete work): STILL OPEN — re-read current `tasks.md`, those items remain unchecked.
- **WARNING #2** (spec.md says `created_at`, design/code use `evolution_date`): STILL OPEN — spec.md's Auto-Transition-to-Completado requirement/scenarios (lines 28, 33, 39, 45) still say `created_at`; code and design still use `evolution_date`. No wording fix has landed.
- **WARNING #3** (Dashboard.tsx alerts/professionalPatientCards reading legacy `evolutions.nextControl`): **CLOSED** — confirmed both widgets now read `activeTurnos` exclusively (see #2 above). tasks.md now reflects this as task 6.2, checked.
- **WARNING #4** (proposal's "fully removed" marker wording): STILL OPEN, unchanged — `getNextControlTime` (src/lib/appointments.ts:86) remains and is still consumed live by `src/lib/exportPdf.ts` and `src/pages/Assistant.tsx`. No decoy `'Turno programado'` evolution-insert pattern remains anywhere in `src/pages` or `src/context` (only appears in `src/data/demoData.ts` seed fixtures, which is inert demo data, not a live write path).

### 5. Build/Test Evidence (re-run)
- `npx tsc --noEmit`: clean, zero errors.
- `npm test -- --run`: 112/112 tests passed across 8 files, no regressions. No new test was added for the evolution-close → `createTurno` linkage or the Dashboard memo changes (page-level logic, consistent with the project's existing manual/E2E convention for pages rather than Vitest unit tests).

### Updated Issues List

#### CRITICAL
None.

#### WARNING (updated)
1. tasks.md checkboxes 1.1/1.2/2.1/3.1/3.2/3.3 still out of sync with completed work. *(unchanged, still open)*
2. spec.md vs design.md/code terminology drift on `created_at` vs `evolution_date`. *(unchanged, still open)*
3. ~~Dashboard.tsx alerts/professionalPatientCards reading legacy evolutions~~ — **CLOSED**, superseded by new item 5 below.
4. Proposal wording "fully removed" marker helpers should be caveated (3 read helpers intentionally kept). *(unchanged, still open)*
5. **NEW**: No dedup/upsert guard when `NewCuration.tsx`'s evolution-close creates a `turno` — repeated curación closes with overlapping próximo-control dates for the same case will create multiple concurrent `programado` turnos rather than reconciling to one. Not covered by any spec/design requirement; recommend either a pre-insert check against existing active turnos for the case, or an explicit spec decision that this is acceptable (e.g., "last write wins" is not implemented — it is pure accumulation).

#### SUGGESTION
- Consider a follow-up integration/RLS test once the migration is applied. *(unchanged from original report)*

## Updated Final Verdict

**PASS WITH WARNINGS.** The single-source-of-truth gap (evolution-close never producing a `turno`, and Dashboard widgets reading stale evolution fields) is now genuinely CLOSED — both fixes verified correct at the code level (proper placement, correct IDs, non-blocking failure handling, correct hook dependencies). No CRITICAL blockers. Three of the four original WARNINGs remain open (checkboxes, spec wording, proposal wording caveat) and one new WARNING was found (duplicate-turno risk on repeated evolution closes with overlapping próximo-control dates) — none of these block archive on their own, but should be triaged/documented before closing the change.
