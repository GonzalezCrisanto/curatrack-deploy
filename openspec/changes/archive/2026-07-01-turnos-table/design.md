# Design: Dedicated `turnos` (appointments) table

## Technical Approach

New first-class `public.turnos` table as the single source of truth for appointments,
following exploration approach #1 (fully decoupled, deprecate-then-migrate). DDL mirrors
the `evolutions`/`wound_cases` house style (text+CHECK status, `update_updated_at_column()`
trigger, RESTRICTIVE Sponsors-denied + owner-only RLS). Lifecycle stays consistent with the
project's client-side date logic in `src/lib/appointments.ts`: only the base states
(`programado`, `cancelado`) are ever written; `completado`/`vencido` are DERIVED on-read in
`AppContext.tsx`, since no cron/scheduled infra exists. Turno CRUD lands in `AppContext`
alongside patient CRUD, with a REAL `.delete()` (unlike the `deleteEvolution` no-op bug).

## Full DDL

```sql
-- turnos: standalone appointments per wound_case
CREATE TABLE IF NOT EXISTS public.turnos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  case_id        uuid NOT NULL REFERENCES public.wound_cases(id) ON DELETE CASCADE,
  patient_id     uuid NOT NULL REFERENCES public.patients(id)  ON DELETE CASCADE, -- query convenience for agenda
  scheduled_date date NOT NULL,
  scheduled_time time,
  status         text NOT NULL DEFAULT 'programado'
                   CHECK (status IN ('programado', 'cancelado')), -- only base states are stored
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors denied on turnos"
  ON public.turnos AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT has_role(auth.uid(), 'sponsor'::app_role))
  WITH CHECK (NOT has_role(auth.uid(), 'sponsor'::app_role));

CREATE POLICY "Users read own turnos"   ON public.turnos FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own turnos" ON public.turnos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own turnos" ON public.turnos FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own turnos" ON public.turnos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER turnos_updated_at BEFORE UPDATE ON public.turnos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_turnos_user_id        ON public.turnos(user_id);
CREATE INDEX IF NOT EXISTS idx_turnos_case_id        ON public.turnos(case_id);
CREATE INDEX IF NOT EXISTS idx_turnos_patient_id     ON public.turnos(patient_id);
CREATE INDEX IF NOT EXISTS idx_turnos_scheduled_date ON public.turnos(scheduled_date);
```

Appended to `supabase/migrations/NUEVABD.sql` (the project's single consolidated migration).
`types.ts` regenerated via `supabase gen types` — never hand-edited.

## Architecture Decisions

### Decision: Stored base status + derived status on-read

**Choice**: Persist only `programado`/`cancelado`. Compute `completado`/`vencido` in
`AppContext` when composing the app-shape `Turno`.
**Alternatives**: (a) store all 4 states updated by app code at read/write; (b) SQL view /
generated column exposing derived status.
**Rationale**: No cron infra exists, so a stored `vencido` would silently go stale — the DB
CHECK only allows what the app can truthfully write. A SQL view duplicates the date-window
join logic the project already keeps client-side in `appointments.ts`. Deriving in
`AppContext` matches the existing convention and keeps one code path. The `completado`
check ("an evolution logged for this case near the turno date") runs CLIENT-SIDE against
already-loaded `casesByPatient` evolutions — no extra query, same data already hydrated.

### Decision: Derivation rule location

**Choice**: A pure helper `deriveTurnoStatus(turno, caseEvolutions, today)` in
`src/lib/appointments.ts`. `cancelado` short-circuits; else if an evolution exists for
`case_id` with `evolution_date` within `±COMPLETADO_WINDOW_DAYS` (= 3) days of
`scheduled_date` → `completado`; else if `scheduled_date`+`scheduled_time` is before `today`
→ `vencido`; else `programado`.
**Rationale**: Keeps date logic testable and co-located with existing appointment helpers.
The ±3 day window (exported as a named constant `COMPLETADO_WINDOW_DAYS`, not a magic
number) avoids a distant future evolution retroactively completing an old, already-`vencido`
turno, while still tolerating the realistic slack between a scheduled date and the day the
nurse actually shows up and logs it.

## Data Flow

```
NewTurnoDialog ──createTurno──> AppContext ──insert──> public.turnos
Agenda / Dashboard <──turnos[] (derived status)── AppContext <──select── public.turnos
                                        │
                        deriveTurnoStatus(turno, case.evolutions, today)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/NUEVABD.sql` | Modify | Append `turnos` DDL + RLS + trigger + indexes |
| `src/integrations/supabase/types.ts` | Regenerate | `supabase gen types` after migration |
| `src/context/AppContext.tsx` | Modify | `TurnoRow`/`Turno` types, `turnos` state, load turnos, `createTurno`/`updateTurno`/`cancelTurno`/`deleteTurno`; stop writing `next_control*` |
| `src/lib/appointments.ts` | Modify | Add `deriveTurnoStatus` + reuse `normalizeAppointmentTime`/`formatNextControl`; retire marker helpers |
| `src/pages/Agenda.tsx` | Modify | Render from `turnos` instead of `patients→cases→evolutions` |
| `src/pages/Dashboard.tsx` | Modify | "Nuevo turno" calls `createTurno`, drop decoy-evolution insert |
| `src/pages/PatientDetail.tsx` | Modify | `handleSaveAppointment` calls `createTurno` |
| `src/pages/NewCuration.tsx` | Modify | Retire `[turno_hora]` marker fallback write |

## Interfaces / Contracts

```ts
interface TurnoRow {
  id: string; user_id: string; case_id: string; patient_id: string;
  scheduled_date: string; scheduled_time: string | null;
  status: 'programado' | 'cancelado'; notes: string | null;
  created_at: string; updated_at: string;
}
export type TurnoStatus = 'programado' | 'completado' | 'cancelado' | 'vencido';
interface Turno { // app shape
  id: string; caseId: string; patientId: string;
  date: string; time: string; status: TurnoStatus; notes: string;
}
// AppContext additions
createTurno(input: { caseId: string; patientId: string; date: string; time?: string; notes?: string }): Promise<string | null>;
updateTurno(turno: Turno): Promise<void>;
cancelTurno(id: string): Promise<void>;        // UPDATE status='cancelado'
deleteTurno(id: string): Promise<void>;        // REAL supabase.from('turnos').delete().eq('id', id) — NOT the deleteEvolution no-op
```

`createTurno`/`updateTurno` follow the `addPatient`/`updatePatient` optimistic pattern
(local state update + DB call, reconcile id from `.select().single()`). `deleteTurno` and
`cancelTurno` MUST issue the Supabase call before/with local state mutation — the known
`deleteEvolution` bug (local-only, never hits DB) must NOT be replicated.

## AppContext Integration

New `const [turnoRows, setTurnoRows] = useState<TurnoRow[]>([])`, loaded in the same auth
effect that loads patients/cases (query `turnos` by `patient_id IN patientIds`). A `turnos`
memo maps rows → `Turno` app-shape, applying `deriveTurnoStatus` against the matching
case's evolutions from `casesByPatient`. Exposed via context value like the patient CRUD.

## Migration / Rollout

Additive migration; `DROP TABLE public.turnos CASCADE` reverts. **Out of scope (call-out
only, no backfill):** existing appointments living as `evolutions.next_control`/
`next_control_time` on real clinical evolutions are historical/already-passed and are NOT
migrated into `turnos`. Legacy `next_control*` columns stay readable during transition but
stop receiving new writes (`NewCuration.tsx` still sets `next_control` for the "próximo
control" of a real evolution close — that is a genuine evolution field, distinct from a
standalone turno; only the decoy-evolution turno path is retired).

## Retiring `src/lib/appointments.ts`

| Helper | Fate | Reason |
|--------|------|--------|
| `normalizeAppointmentTime` | Keep | Still normalizes `scheduled_time` for display |
| `formatNextControl` | Keep | Reusable date+time formatter for turno rendering |
| `extractNextControlTime` | Remove | Only parses legacy `[turno_hora]` marker |
| `stripNextControlTimeMarker` | Remove | Marker no longer written |
| `appendNextControlTimeMarker` | Remove | Marker write path retired |
| `getNextControlTime` | Remove | Depends on decoy-evolution `'Turno programado'` heuristic |
| `deriveTurnoStatus` | **Add** | New pure lifecycle helper |

Removing `extract`/`strip`/`append`/`getNextControlTime` requires clearing their imports in
`AppContext.tsx` (L5, L252, L262) and `Agenda.tsx` (L7) — where evolution reads currently
depend on `extractNextControlTime`/`stripNextControlTimeMarker`, keep reading the real
`next_control_time` column directly (marker fallback drops).

## Open Questions

None — `completado` date-window tolerance is locked at ±3 days (`COMPLETADO_WINDOW_DAYS`),
confirmed by the user.
