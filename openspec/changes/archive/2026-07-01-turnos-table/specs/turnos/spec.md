# Turnos Specification

## Purpose

Defines the standalone `turnos` (appointment) entity: creation independent of evolutions, its four-state lifecycle (`programado`, `completado`, `cancelado`, `vencido`), and access control mirroring the existing `evolutions`/`wound_cases` RLS pattern.

## Requirements

### Requirement: Standalone Turno Creation

The system MUST allow creating a `turno` for a `wound_case` without requiring an associated `evolution` row. Every `turno` MUST reference exactly one `case_id` (NOT NULL, foreign key to `wound_cases`).

#### Scenario: Create a turno with no evolution

- GIVEN an authenticated professional owns a `wound_case`
- WHEN they create a turno with a scheduled date/time for that case and no evolution exists yet
- THEN a new row is inserted into `public.turnos` with `status = 'programado'`
- AND no row is inserted into `public.evolutions`

#### Scenario: Reject turno without a case

- GIVEN an authenticated professional
- WHEN they attempt to create a turno without a `case_id`
- THEN the insert is rejected (NOT NULL constraint violation)

### Requirement: Auto-Transition to Completado

The system MUST auto-resolve a turno's status to `completado`, computed on-read, when an evolution is logged for the same `case_id` with `evolution_date` (the clinical date the evolution was logged for, not the row's insert timestamp) within ±3 days of the turno's scheduled date (`scheduled_date`) — i.e. `scheduled_date - 3` through `scheduled_date + 3`, inclusive — and the turno is currently `programado`.

#### Scenario: Evolution logged on the turno's scheduled date

- GIVEN a turno with `status = 'programado'` and `scheduled_date = 2026-07-01`
- WHEN an evolution for the same `case_id` is logged with `evolution_date` `2026-07-01`
- THEN reading the turno returns `status = 'completado'`

#### Scenario: Evolution logged within the ±3 day window completes it

- GIVEN a turno with `status = 'programado'` and `scheduled_date = 2026-07-10`
- WHEN an evolution for the same `case_id` is logged with `evolution_date` `2026-07-12` (2 days after the scheduled date)
- THEN reading the turno returns `status = 'completado'`

#### Scenario: Evolution logged outside the ±3 day window does not complete it

- GIVEN a turno with `status = 'programado'` and `scheduled_date = 2026-07-10`
- WHEN an evolution for the same `case_id` is logged with `evolution_date` `2026-07-20` (10 days after the scheduled date)
- THEN reading the turno still returns `status = 'programado'` (outside the window, does not auto-complete)
- AND if the current date is also past `scheduled_date` + `scheduled_time`, the turno instead resolves to `vencido`

#### Scenario: Cancelled turno never becomes completado

- GIVEN a turno with `status = 'cancelado'`
- WHEN an evolution for the same `case_id` is logged with any date
- THEN reading the turno still returns `status = 'cancelado'`

### Requirement: Auto-Transition to Vencido (On-Read)

The system MUST compute `vencido` on-read (no cron/scheduled job) when: the turno's `status` is currently `programado`, AND the current date/time is past the turno's `scheduled_date` + `scheduled_time`, AND no qualifying evolution exists to mark it `completado`.

#### Scenario: Scheduled date has passed with no evolution logged

- GIVEN a turno with `status = 'programado'` and `scheduled_date` + `scheduled_time` earlier than the current date/time
- AND no evolution has been logged for the same `case_id` within the ±3 day window around `scheduled_date`
- WHEN the turno is read
- THEN it is returned with computed `status = 'vencido'`

#### Scenario: Scheduled date has passed but a qualifying evolution was logged within the window

- GIVEN a turno with `status = 'programado'` and `scheduled_date` earlier than the current date
- AND an evolution for the same `case_id` was logged within the ±3 day window around `scheduled_date`
- WHEN the turno is read
- THEN the `completado` rule takes precedence and it is returned with `status = 'completado'`, not `vencido`

#### Scenario: Cancelled turno never becomes vencido

- GIVEN a turno with `status = 'cancelado'` and `scheduled_date` in the past
- WHEN the turno is read
- THEN it is returned with `status = 'cancelado'` (not recomputed as `vencido`)

### Requirement: Manual Cancellation

The system MUST allow the owning professional (or admin) to manually cancel a turno, setting `status = 'cancelado'`. Once cancelled, a turno's status MUST NOT be recomputed to `completado` or `vencido` by any read-path or write-path logic.

#### Scenario: Cancel a scheduled turno

- GIVEN a turno with `status = 'programado'`
- WHEN the owning professional cancels it
- THEN `status` is updated to `cancelado`
- AND subsequent reads never return `completado` or `vencido` for this turno regardless of date or evolution activity

### Requirement: Row-Level Security

The system MUST enforce RLS on `public.turnos` mirroring the pattern used for `evolutions` and `wound_cases`: a RESTRICTIVE policy denying the `sponsor` role entirely, plus permissive policies scoping SELECT to the owning professional or an admin, and INSERT/UPDATE/DELETE to the owning professional only.

#### Scenario: Sponsor denied all access

- GIVEN an authenticated user with role `sponsor`
- WHEN they query `public.turnos` (SELECT, INSERT, UPDATE, or DELETE)
- THEN the RESTRICTIVE policy denies the operation regardless of any permissive policy

#### Scenario: Professional sees only their own turnos

- GIVEN two professionals, A and B, each owning separate turnos
- WHEN professional A queries `public.turnos`
- THEN only turnos where `user_id = auth.uid()` (A's own) are returned

#### Scenario: Admin can view all turnos

- GIVEN a user with role `admin`
- WHEN they query `public.turnos`
- THEN turnos belonging to any professional are returned

#### Scenario: Professional cannot modify another professional's turno

- GIVEN professional A owns a turno and professional B does not
- WHEN professional B attempts to UPDATE or DELETE that turno
- THEN the operation affects zero rows (denied by the owner-only policy)

### Requirement: Real Deletion Semantics

The system MUST implement turno deletion as an actual Supabase `DELETE` operation against `public.turnos`, persisting the removal server-side. Turno deletion MUST NOT be a local-only state update (contrasting with the known `deleteEvolution` no-op bug, which is out of scope for this change and must not be replicated).

#### Scenario: Delete a turno

- GIVEN a turno owned by the authenticated professional
- WHEN they delete it via the turno CRUD API
- THEN a `DELETE` statement is issued against `public.turnos` for that row
- AND re-fetching turnos for that case (e.g. after a page reload) no longer includes the deleted row
