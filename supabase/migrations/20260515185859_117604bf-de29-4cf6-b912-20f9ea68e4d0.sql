CREATE POLICY "Admins delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));