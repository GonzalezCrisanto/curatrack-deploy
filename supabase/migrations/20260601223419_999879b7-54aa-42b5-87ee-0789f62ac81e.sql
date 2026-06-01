
CREATE POLICY "Authenticated can insert lab products"
ON public.lab_products FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update lab products"
ON public.lab_products FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete lab products"
ON public.lab_products FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);
