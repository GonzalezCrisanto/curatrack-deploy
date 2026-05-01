
-- 1. Harden handle_new_user: never trust client-supplied 'admin' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
BEGIN
  _role := NEW.raw_user_meta_data ->> 'role';
  -- Never accept 'admin' from client metadata; force safe default
  IF _role IS NULL OR _role = 'admin' THEN
    _role := 'enfermero';
  END IF;

  INSERT INTO public.profiles (user_id, first_name, last_name, role, institution, license)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    _role,
    NEW.raw_user_meta_data ->> 'institution',
    NEW.raw_user_meta_data ->> 'license'
  );

  -- Always assign the safe 'professional' role; never 'admin'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'professional');

  RETURN NEW;
END;
$function$;

-- 2. Restrict lab_sellers SELECT to safe public columns + seller's own row for contact info
DROP POLICY IF EXISTS "Authenticated can read active sellers" ON public.lab_sellers;

CREATE POLICY "Sellers see their own full record"
ON public.lab_sellers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Public-safe view exposing only non-sensitive columns
CREATE OR REPLACE VIEW public.lab_sellers_public
WITH (security_invoker = true)
AS
SELECT id, lab_id, full_name, zone, avatar_url, is_active, created_at, updated_at
FROM public.lab_sellers
WHERE is_active = true;

GRANT SELECT ON public.lab_sellers_public TO authenticated, anon;

-- 3. Add UPDATE policy on supply_order_items mirroring ownership via parent order
CREATE POLICY "Users update own order items"
ON public.supply_order_items
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.supply_orders o
  WHERE o.id = supply_order_items.order_id AND o.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.supply_orders o
  WHERE o.id = supply_order_items.order_id AND o.user_id = auth.uid()
));

-- 4. Prevent self-insert privilege escalation on user_roles
-- Add a RESTRICTIVE policy: only admins may INSERT/UPDATE/DELETE
CREATE POLICY "Only admins write roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Lock down SECURITY DEFINER helpers so anon/authenticated can't call them via PostgREST
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_default_sponsor() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_demo_patients_for_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;
-- has_role must remain callable: it is used by RLS policies (called as auth role)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
