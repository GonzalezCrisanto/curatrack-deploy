
-- Admin can read all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can read all patients
CREATE POLICY "Admins can view all patients"
ON public.patients FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can read all orders
CREATE POLICY "Admins can view all orders"
ON public.supply_orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can update any order (change status)
CREATE POLICY "Admins can update all orders"
ON public.supply_orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can read all order items
CREATE POLICY "Admins can view all order items"
ON public.supply_order_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
