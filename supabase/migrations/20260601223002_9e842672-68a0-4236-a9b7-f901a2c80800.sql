
-- Relax INSERT restrictions on clinical tables so any authenticated user can load data,
-- while keeping SELECT/UPDATE/DELETE scoped to the owner (auth.uid() = user_id)
-- to preserve clinical privacy.

-- patients
DROP POLICY IF EXISTS "Users can insert their own patients" ON public.patients;
CREATE POLICY "Authenticated can insert patients"
ON public.patients FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- wound_cases
DROP POLICY IF EXISTS "Users can insert their own cases" ON public.wound_cases;
CREATE POLICY "Authenticated can insert cases"
ON public.wound_cases FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- evolutions
DROP POLICY IF EXISTS "Users can insert their own evolutions" ON public.evolutions;
CREATE POLICY "Authenticated can insert evolutions"
ON public.evolutions FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- photos
DROP POLICY IF EXISTS "Users can insert their own photos" ON public.photos;
CREATE POLICY "Authenticated can insert photos"
ON public.photos FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- patient_consents
DROP POLICY IF EXISTS "Users can insert consents for own patients" ON public.patient_consents;
CREATE POLICY "Authenticated can insert consents"
ON public.patient_consents FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- evolution_signatures
DROP POLICY IF EXISTS "Users can insert own evolution signatures" ON public.evolution_signatures;
CREATE POLICY "Authenticated can insert evolution signatures"
ON public.evolution_signatures FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
