-- Block sponsor role from all clinical datasets (defense-in-depth).
-- This complements frontend route guards and prevents data leaks via direct API calls.
-- It is resilient across environments where some tables may not exist yet.

DO $$
BEGIN
  IF to_regclass('public.patients') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Sponsors denied on patients" ON public.patients';
    EXECUTE 'CREATE POLICY "Sponsors denied on patients" AS RESTRICTIVE ON public.patients FOR ALL TO authenticated USING (NOT has_role(auth.uid(), ''sponsor''::app_role)) WITH CHECK (NOT has_role(auth.uid(), ''sponsor''::app_role))';
  END IF;

  IF to_regclass('public.wound_cases') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.wound_cases ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Sponsors denied on wound_cases" ON public.wound_cases';
    EXECUTE 'CREATE POLICY "Sponsors denied on wound_cases" AS RESTRICTIVE ON public.wound_cases FOR ALL TO authenticated USING (NOT has_role(auth.uid(), ''sponsor''::app_role)) WITH CHECK (NOT has_role(auth.uid(), ''sponsor''::app_role))';
  END IF;

  IF to_regclass('public.evolutions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.evolutions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Sponsors denied on evolutions" ON public.evolutions';
    EXECUTE 'CREATE POLICY "Sponsors denied on evolutions" AS RESTRICTIVE ON public.evolutions FOR ALL TO authenticated USING (NOT has_role(auth.uid(), ''sponsor''::app_role)) WITH CHECK (NOT has_role(auth.uid(), ''sponsor''::app_role))';
  END IF;

  IF to_regclass('public.patient_consents') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Sponsors denied on patient_consents" ON public.patient_consents';
    EXECUTE 'CREATE POLICY "Sponsors denied on patient_consents" AS RESTRICTIVE ON public.patient_consents FOR ALL TO authenticated USING (NOT has_role(auth.uid(), ''sponsor''::app_role)) WITH CHECK (NOT has_role(auth.uid(), ''sponsor''::app_role))';
  END IF;

  IF to_regclass('public.evolution_signatures') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.evolution_signatures ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Sponsors denied on evolution_signatures" ON public.evolution_signatures';
    EXECUTE 'CREATE POLICY "Sponsors denied on evolution_signatures" AS RESTRICTIVE ON public.evolution_signatures FOR ALL TO authenticated USING (NOT has_role(auth.uid(), ''sponsor''::app_role)) WITH CHECK (NOT has_role(auth.uid(), ''sponsor''::app_role))';
  END IF;
END
$$;
