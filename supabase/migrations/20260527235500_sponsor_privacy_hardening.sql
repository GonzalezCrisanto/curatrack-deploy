-- Sponsor privacy hardening (Ley 25.326)
-- - Restrict sponsor access to own lab products only
-- - Remove direct sponsor access to raw supply_orders / supply_order_items
-- - Expose anonymized sponsor-safe RPCs for orders and items

-- ---------------------------------------------------------------------------
-- 1) Lab products: enforce per-lab visibility for sponsor users
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read active products" ON public.lab_products;

CREATE POLICY "Professionals can read active products in own lab"
ON public.lab_products
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND has_role(auth.uid(), 'professional'::app_role)
  AND lab_id IN (
    SELECT uls.lab_id
    FROM public.user_lab_sponsors uls
    WHERE uls.user_id = auth.uid()
      AND uls.is_active = true
  )
);

CREATE POLICY "Sponsors can read products in own lab"
ON public.lab_products
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sponsor'::app_role)
  AND lab_id IN (
    SELECT uls.lab_id
    FROM public.user_lab_sponsors uls
    WHERE uls.user_id = auth.uid()
      AND uls.is_active = true
  )
);

CREATE POLICY "Sponsors can insert products in own lab"
ON public.lab_products
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'sponsor'::app_role)
  AND lab_id IN (
    SELECT uls.lab_id
    FROM public.user_lab_sponsors uls
    WHERE uls.user_id = auth.uid()
      AND uls.is_active = true
  )
);

CREATE POLICY "Sponsors can update products in own lab"
ON public.lab_products
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'sponsor'::app_role)
  AND lab_id IN (
    SELECT uls.lab_id
    FROM public.user_lab_sponsors uls
    WHERE uls.user_id = auth.uid()
      AND uls.is_active = true
  )
)
WITH CHECK (
  has_role(auth.uid(), 'sponsor'::app_role)
  AND lab_id IN (
    SELECT uls.lab_id
    FROM public.user_lab_sponsors uls
    WHERE uls.user_id = auth.uid()
      AND uls.is_active = true
  )
);

-- ---------------------------------------------------------------------------
-- 2) Supply orders/items: remove direct sponsor SELECT access (raw PII fields)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Sponsors can view orders of their lab" ON public.supply_orders;
DROP POLICY IF EXISTS "Sponsors can view items of orders in their lab" ON public.supply_order_items;

-- ---------------------------------------------------------------------------
-- 3) Sponsor-safe RPCs with anonymized output
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_sponsor_orders_anon(
  p_period_days INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  institution TEXT,
  general_wound_type TEXT,
  estimated_total NUMERIC,
  currency TEXT,
  channel TEXT,
  anonymized_case_code TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.order_number,
    o.status,
    o.created_at,
    o.sent_at,
    COALESCE(NULLIF(o.institution, ''), 'Institución no especificada') AS institution,
    COALESCE(NULLIF(o.general_wound_type, ''), 'Sin clasificar') AS general_wound_type,
    o.estimated_total,
    COALESCE(o.currency, 'ARS') AS currency,
    o.channel,
    'CASO-' || UPPER(SUBSTRING(md5(o.id::text), 1, 8)) AS anonymized_case_code
  FROM public.supply_orders o
  WHERE o.lab_id IN (
    SELECT uls.lab_id
    FROM public.user_lab_sponsors uls
    WHERE uls.user_id = auth.uid()
      AND uls.is_active = true
  )
  AND (
    p_period_days IS NULL
    OR o.created_at >= (now() - make_interval(days => p_period_days))
  )
  ORDER BY o.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_sponsor_order_items_anon(
  p_order_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  order_id UUID,
  product_id UUID,
  product_name TEXT,
  product_sku TEXT,
  presentation TEXT,
  quantity INTEGER,
  unit_price NUMERIC,
  subtotal NUMERIC,
  currency TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    soi.id,
    soi.order_id,
    soi.product_id,
    soi.product_name,
    soi.product_sku,
    soi.presentation,
    soi.quantity,
    soi.unit_price,
    soi.subtotal,
    COALESCE(soi.currency, 'ARS') AS currency
  FROM public.supply_order_items soi
  INNER JOIN public.supply_orders o ON o.id = soi.order_id
  WHERE o.lab_id IN (
    SELECT uls.lab_id
    FROM public.user_lab_sponsors uls
    WHERE uls.user_id = auth.uid()
      AND uls.is_active = true
  )
  AND (p_order_ids IS NULL OR soi.order_id = ANY(p_order_ids))
  ORDER BY soi.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_sponsor_orders_anon(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sponsor_order_items_anon(UUID[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Sponsor settings: allow sponsor to update own sponsor identity only
-- ---------------------------------------------------------------------------
CREATE POLICY "Sponsors can update own sponsor settings"
ON public.sponsors
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'sponsor'::app_role)
  AND (
    id IN (
      SELECT us.sponsor_id
      FROM public.user_sponsor us
      WHERE us.user_id = auth.uid()
    )
    OR lab_id IN (
      SELECT uls.lab_id
      FROM public.user_lab_sponsors uls
      WHERE uls.user_id = auth.uid()
        AND uls.is_active = true
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'sponsor'::app_role)
  AND (
    id IN (
      SELECT us.sponsor_id
      FROM public.user_sponsor us
      WHERE us.user_id = auth.uid()
    )
    OR lab_id IN (
      SELECT uls.lab_id
      FROM public.user_lab_sponsors uls
      WHERE uls.user_id = auth.uid()
        AND uls.is_active = true
    )
  )
);
