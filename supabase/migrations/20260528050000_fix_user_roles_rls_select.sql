-- Fix: "Only admins write roles" was declared FOR ALL (RESTRICTIVE), which
-- accidentally blocked non-admin SELECT too. A sponsor user's role query
-- returned empty rows, causing the fallback to 'professional' and exposing
-- clinical UI sections to lab users.
--
-- Correct intent: restrict writes (INSERT/UPDATE/DELETE) to admins only,
-- while allowing each user to read their own role row.

DROP POLICY IF EXISTS "Only admins write roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users read own role"     ON public.user_roles;

-- Write protection: admins only (RESTRICTIVE, scoped to mutations only)
CREATE POLICY "Only admins insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Read: each user sees only their own row; admins see all
CREATE POLICY "Users read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
