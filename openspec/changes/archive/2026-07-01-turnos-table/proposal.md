# Proposal: Dedicated `turnos` (appointments) table

## Intent

Turnos (appointments) have no home of their own. Today a turno only exists as `evolutions.next_control` / `next_control_time`. To schedule a standalone turno (e.g. a first visit) the app fabricates a **decoy `evolutions` row** (`description: 'Turno programado'`, empty clinical fields) in `Dashboard.tsx` and `PatientDetail.tsx`, and `src/lib/appointments.ts` still parses a legacy `[turno_hora:HH:MM]` text marker. This pollutes clinical history, blocks real turno lifecycle states, and is fragile. This change gives turnos a first-class table with an explicit lifecycle.

## Scope

### In Scope
- New `public.turnos` table: `case_id` NOT NULL, scheduled date+time, `status` (`programado` | `completado` | `cancelado` | `vencido`), owner + timestamps.
- RLS mirroring `evolutions`/`wound_cases`: RESTRICTIVE Sponsors-denied + owner-only permissive policies.
- Turno CRUD in `AppContext` (real Supabase DELETE, not the local-only `deleteEvolution` bug pattern).
- Standalone turno creation (no evolution required) — retires the decoy-evolution hack in `Dashboard.tsx` and `PatientDetail.tsx`.
- Retire the legacy `[turno_hora:HH:MM]` marker + `NewCuration.tsx` fallback write.
- Read-path lifecycle: `completado` auto-set when an evolution is logged for the case near the turno date; `vencido` computed on-read (date passed, no evolution); `cancelado` manual.
- Point Agenda / Dashboard / consumers at the new table.

### Out of Scope
- Dropping `evolutions.next_control*` columns (deprecate now, migrate/drop in a later change).
- `pg_cron` / scheduled Edge Function for `vencido` (computed on-read instead).
- Fixing the pre-existing `deleteEvolution` no-op bug (flagged, separate change).
- Notifications/reminders for upcoming turnos.

## Capabilities

### New Capabilities
- `turnos`: appointment entity with case linkage, scheduling, and the four-state lifecycle (create/read/cancel + auto completado/vencido).

### Modified Capabilities
- None (no existing openspec specs).

## Approach

Exploration approach #1 — fully decoupled table, **deprecate-then-migrate**. New `turnos` table is the single source of truth; `evolutions.next_control*` stay readable during transition but stop receiving new writes. No DB trigger mirroring (avoids dual write paths). `vencido`/`completado` derived on-read since no cron infra exists.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/NUEVABD.sql` | New | `turnos` table, RLS, indexes |
| `src/integrations/supabase/types.ts` | Modified | Regenerate via `supabase gen types` (no hand-edit) |
| `src/context/AppContext.tsx` | Modified | Turno CRUD, stop `next_control*` writes |
| `src/pages/Agenda.tsx` | Modified | Read turnos table |
| `src/pages/Dashboard.tsx`, `PatientDetail.tsx` | Modified | Remove decoy-evolution hack |
| `src/pages/NewCuration.tsx` | Modified | Retire marker fallback |
| `src/lib/appointments.ts` | Modified/Removed | Drop `[turno_hora]` parsing |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Blast radius 8+ files exceeds 400-line PR budget | High | Chained/stacked PRs (flag at sdd-tasks) |
| On-read `vencido`/`completado` drift | Med | Deterministic date-window rule in spec |
| Legacy `next_control*` reads during transition | Med | Keep columns readable until later drop |

## Rollback Plan

Migration is additive — `DROP TABLE public.turnos CASCADE` reverts DB. Legacy columns untouched, so reverting frontend commits restores old behavior with no data loss.

## Dependencies

- `supabase gen types` after migration.

## Success Criteria

- [ ] Standalone turno creates with no `evolutions` row.
- [ ] Decoy-evolution hack and `[turno_hora]` marker fully removed.
- [ ] All four lifecycle states resolve correctly (auto + manual).
- [ ] Sponsors denied; owners see only their turnos.
- [ ] Agenda/Dashboard read from `turnos`.
