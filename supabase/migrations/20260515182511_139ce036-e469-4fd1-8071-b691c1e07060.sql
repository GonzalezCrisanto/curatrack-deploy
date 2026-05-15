CREATE POLICY "Sponsors can view orders of their lab"
ON public.supply_orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sponsor'::app_role)
  AND lab_id IN (
    SELECT lab_id FROM public.user_lab_sponsors
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Sponsors can view items of orders in their lab"
ON public.supply_order_items
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sponsor'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.supply_orders o
    WHERE o.id = supply_order_items.order_id
      AND o.lab_id IN (
        SELECT lab_id FROM public.user_lab_sponsors
        WHERE user_id = auth.uid() AND is_active = true
      )
  )
);