-- Public bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read; only admins write
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins write product images" ON storage.objects;
CREATE POLICY "Admins write product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
CREATE POLICY "Admins update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));