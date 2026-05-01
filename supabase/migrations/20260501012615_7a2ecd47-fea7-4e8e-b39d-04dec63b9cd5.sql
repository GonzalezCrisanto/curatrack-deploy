-- 1) Lock down has_role: revoke from anon/public, keep authenticated (required for RLS evaluation across queries)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2) Re-affirm lab_sellers SELECT policy is strictly seller-or-admin (drop any legacy permissive policy if present)
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lab_sellers' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lab_sellers', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Sellers or admins read sellers"
ON public.lab_sellers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
