# Exploration — Dedicated `turnos` (appointments) table

## Locked product decisions (from user, do not re-litigate in proposal/design)

1. A turno is an independent entity — it can be created without originating from an evolution (e.g. scheduling a first visit for a new patient), not just as a side-effect of closing an evolution.
2. A turno always belongs to a specific `wound_case` (`case_id` NOT NULL) — no case-less/general-patient turnos.
3. Turno lifecycle states: `programado` (scheduled), `completado` (auto-transitions when an evolution is logged for that patient/case around the turno's date), `cancelado` (manual, user-triggered), `vencido` (auto — date has passed with no evolution logged).

## Current state

`public.evolutions` (`supabase/migrations/NUEVABD.sql`) carries `next_control` (date) and `next_control_time` (time, added mig-26). `public.wound_cases.status` uses `text + CHECK` (no real enum); the only true Postgres ENUM in the DB is `app_role`. RLS on both tables follows: a RESTRICTIVE "Sponsors denied" policy blocking the `sponsor` role entirely, plus permissive owner-only policies (`auth.uid() = user_id` for insert/update/delete, `auth.uid() = user_id OR admin` for select).

No `pg_cron` extension and no scheduled Edge Function exist anywhere in `supabase/functions/` — all six functions are HTTP-triggered. This means the `vencido` auto-transition has no server-side automation available today; it would have to be computed on-read/client-side unless new cron infra is added.

## Key finding: the "decoy evolution" hack

`src/pages/Dashboard.tsx` ("Nuevo turno" dialog, ~L881-902) and `src/pages/PatientDetail.tsx` (`handleSaveAppointment`, L420-437) both create a **fake `evolutions` row** (`description: 'Turno programado'`, all clinical fields empty) purely to carry a `next_control` date/time when scheduling a turno that isn't tied to a real evolution. This is exactly the gap product decision #1 (turno as independent entity) is meant to close.

`src/lib/appointments.ts` also carries the legacy `[turno_hora:HH:MM]` text-marker fallback, and `NewCuration.tsx` (L396-443) has a defensive retry that falls back to writing that marker into `observations` if the `next_control_time` column insert fails — dead-code risk to retire explicitly.

## Affected areas

- `supabase/migrations/NUEVABD.sql` — needs new `turnos` table + RLS (same Sponsors-denied + owner pattern) + trigger + indexes
- `src/context/AppContext.tsx` — sole data-access layer; reads/writes `next_control*` at L252-264, L488-523, L548-580; needs new turno CRUD here
- `src/pages/Agenda.tsx` — builds its list purely from `patients→cases→evolutions` in memory (L14-26), no direct query
- `src/pages/Dashboard.tsx`, `src/pages/PatientDetail.tsx` — decoy-evolution "Nuevo turno" hack + conflict/suggestion logic scanning evolutions
- `src/pages/CaseDetail.tsx` — actual "close evolution" flow uses the generic `updateEvolution` (L355, L404), also feeds `proximo_control` into the AI-summary edge function payload (L266)
- `src/pages/NewCuration.tsx` — primary flow that sets "próximo control" today
- `src/pages/Assistant.tsx`, `src/lib/exportPdf.ts` — read-only consumers
- `src/data/demoData.ts`, `src/integrations/supabase/types.ts` (auto-generated — must not hand-edit per CLAUDE.md, regenerate via `supabase gen types`)

## Pre-existing bug noted (out of scope, flag for design phase)

`AppContext.deleteEvolution` never issues a Supabase DELETE — only updates local state. The design for turno cancel/delete must not replicate this pattern.

## Approaches compared

1. **Fully decoupled `turnos` table, deprecate-then-drop `evolutions.next_control*` later — recommended.** High effort but matches all three locked product decisions cleanly, no hidden trigger logic.
2. `turnos` + DB trigger mirroring from `evolutions` — lower short-term churn but creates two write paths (trigger-mirror + direct-insert for standalone turnos) — consistency risk, effort High long-term.
3. Immediate full cutover, drop legacy columns in the same change — cleanest end state but no rollback safety net and likely blows the 400-line PR budget in one shot.

## Open risks / questions for proposal phase

- No cron infra for `vencido` transition — needs explicit decision in proposal/design (on-read computed status recommended over adding pg_cron).
- `types.ts` must be regenerated after the migration, not hand-edited.
- Sizeable blast radius (8+ files) — will likely need chained/stacked PRs (review workload forecast should flag this at `sdd-tasks`).
