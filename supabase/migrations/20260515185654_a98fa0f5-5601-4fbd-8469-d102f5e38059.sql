
-- 1. lab_sellers: enforce user_id NOT NULL
ALTER TABLE public.lab_sellers ALTER COLUMN user_id SET NOT NULL;

-- 2. sponsors: hide support_email from anonymous visitors (keep for authenticated)
REVOKE SELECT (support_email) ON public.sponsors FROM anon;

-- 3. signatures bucket: add owner DELETE + UPDATE policies
CREATE POLICY "Users can update own signatures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'signatures' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'signatures' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own signatures"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'signatures' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4. SECURITY DEFINER functions: revoke EXECUTE from public/anon/authenticated
-- These are internal trigger/seed helpers; only the service role should call them.
REVOKE EXECUTE ON FUNCTION public.seed_demo_clinical_for_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_demo_patients_for_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_default_sponsor() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;

-- has_role is intentionally kept executable: RLS policies depend on it.
