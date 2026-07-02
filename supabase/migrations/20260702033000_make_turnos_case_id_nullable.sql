-- A turno now represents the whole patient visit (the nurse treats every
-- active wound during the same appointment), not a single wound_case. Make
-- case_id nullable so new turnos are created without a wound reference,
-- while existing historical rows keep their original case_id untouched.
ALTER TABLE public.turnos ALTER COLUMN case_id DROP NOT NULL;
