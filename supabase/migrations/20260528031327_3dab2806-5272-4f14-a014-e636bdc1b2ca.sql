
-- Restrict sponsors.support_email from anonymous access
DROP POLICY IF EXISTS "Anyone can read active sponsors" ON public.sponsors;

CREATE POLICY "Anon can read active sponsors branding"
ON public.sponsors FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Authenticated can read active sponsors"
ON public.sponsors FOR SELECT
TO authenticated
USING (is_active = true);

-- Column-level: anon may not read sensitive contact columns
REVOKE SELECT ON public.sponsors FROM anon;
GRANT SELECT (
  id, slug, sponsor_name, app_name, logo_url,
  primary_color, secondary_color, accent_color,
  sponsor_label, catalog_name, powered_by_label,
  legal_footer, sales_contact_label,
  lab_id, is_active, created_at, updated_at
) ON public.sponsors TO anon;

GRANT SELECT ON public.sponsors TO authenticated;
