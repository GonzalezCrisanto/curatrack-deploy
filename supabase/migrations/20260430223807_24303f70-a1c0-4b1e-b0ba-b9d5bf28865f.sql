-- =========================================================================
-- MARKETPLACE CLÍNICO — Fase A
-- =========================================================================

-- 1) Laboratorios
CREATE TABLE public.labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Categorías de producto
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Etiquetas clínicas
CREATE TABLE public.product_clinical_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Productos del laboratorio
CREATE TABLE public.lab_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  image_url TEXT,
  sku TEXT,
  presentation TEXT,            -- ej: "Caja x 10 unidades"
  size TEXT,                    -- ej: "10x10 cm"
  units_per_box INTEGER,
  usage_instructions TEXT,
  datasheet_url TEXT,
  price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'ARS',
  stock INTEGER,
  min_stock INTEGER DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- relaciones rápidas como arrays para filtros simples
  wound_types TEXT[] NOT NULL DEFAULT '{}',
  clinical_tags TEXT[] NOT NULL DEFAULT '{}',
  price_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  price_valid_until TIMESTAMPTZ,
  stock_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_products_lab ON public.lab_products(lab_id);
CREATE INDEX idx_lab_products_category ON public.lab_products(category_id);
CREATE INDEX idx_lab_products_active ON public.lab_products(is_active);
CREATE INDEX idx_lab_products_wound_types ON public.lab_products USING GIN(wound_types);
CREATE INDEX idx_lab_products_clinical_tags ON public.lab_products USING GIN(clinical_tags);

-- 5) Vendedores
CREATE TABLE public.lab_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  user_id UUID,                 -- opcional: si el vendedor también es usuario de la app
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  zone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_sellers_lab ON public.lab_sellers(lab_id);

-- 6) Sponsor asignado por usuario (uno solo activo a la vez)
CREATE TABLE public.user_lab_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lab_id)
);
CREATE UNIQUE INDEX uniq_active_sponsor_per_user
  ON public.user_lab_sponsors(user_id) WHERE is_active = true;

-- 7) Asignación de vendedor por usuario
CREATE TABLE public.seller_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  seller_id UUID NOT NULL REFERENCES public.lab_sellers(id) ON DELETE CASCADE,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  institution TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, seller_id)
);
CREATE UNIQUE INDEX uniq_active_seller_per_user
  ON public.seller_assignments(user_id) WHERE is_active = true;

-- 8) Carrito persistente
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.lab_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('baja','normal','alta','urgente')),
  related_case_id UUID,
  related_evolution_id UUID,
  curation_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cart_items_user ON public.cart_items(user_id);

-- 9) Pedidos de reposición
CREATE TABLE public.supply_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  lab_id UUID REFERENCES public.labs(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.lab_sellers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'borrador'
    CHECK (status IN ('borrador','enviado','recibido','en_preparacion','cotizado','enviado_al_cliente','entregado','cancelado')),
  professional_name TEXT,
  institution TEXT,
  general_wound_type TEXT,           -- tipo general, sin identificar paciente
  clinical_recommendation TEXT,      -- recomendación clínica no identificatoria
  commercial_notes TEXT,
  estimated_total NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'ARS',
  channel TEXT,                      -- 'whatsapp' | 'email' | 'pdf' | NULL
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_supply_orders_user ON public.supply_orders(user_id);
CREATE INDEX idx_supply_orders_seller ON public.supply_orders(seller_id);
CREATE INDEX idx_supply_orders_lab ON public.supply_orders(lab_id);

-- 10) Items del pedido (snapshot al momento del envío)
CREATE TABLE public.supply_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.supply_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.lab_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  presentation TEXT,
  unit_price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'ARS',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(12,2),
  notes TEXT,
  priority TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_supply_order_items_order ON public.supply_order_items(order_id);

-- 11) Reglas de recomendación (placeholder para futuro)
CREATE TABLE public.product_recommendation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  match_wound_type TEXT,
  match_exudate TEXT,
  match_infection BOOLEAN,
  match_clinical_tag TEXT,
  recommended_category_slug TEXT,
  recommended_clinical_tag TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12) Interacciones (analítica)
CREATE TABLE public.product_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.lab_products(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view','recommend','add_to_cart','order')),
  context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_interactions_user ON public.product_interactions(user_id);
CREATE INDEX idx_product_interactions_product ON public.product_interactions(product_id);

-- =========================================================================
-- updated_at triggers
-- =========================================================================
CREATE TRIGGER trg_labs_updated_at BEFORE UPDATE ON public.labs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lab_products_updated_at BEFORE UPDATE ON public.lab_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lab_sellers_updated_at BEFORE UPDATE ON public.lab_sellers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_supply_orders_updated_at BEFORE UPDATE ON public.supply_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- RLS
-- =========================================================================
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_clinical_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lab_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recommendation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_interactions ENABLE ROW LEVEL SECURITY;

-- Catálogo público para autenticados (lectura)
CREATE POLICY "Authenticated can read active labs"
  ON public.labs FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage labs"
  ON public.labs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read categories"
  ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage categories"
  ON public.product_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read tags"
  ON public.product_clinical_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage tags"
  ON public.product_clinical_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read active products"
  ON public.lab_products FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage products"
  ON public.lab_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Vendedores: lectura para autenticados (sin datos sensibles), escritura admin
CREATE POLICY "Authenticated can read active sellers"
  ON public.lab_sellers FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage sellers"
  ON public.lab_sellers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sponsor por usuario: cada uno ve el suyo, admin todo
CREATE POLICY "Users see their sponsor"
  ON public.user_lab_sponsors FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage sponsors"
  ON public.user_lab_sponsors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Asignación de vendedor: cada usuario ve la suya, admin todo
CREATE POLICY "Users see their seller assignment"
  ON public.seller_assignments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage seller assignments"
  ON public.seller_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Carrito: cada usuario gestiona el suyo
CREATE POLICY "Users select own cart" ON public.cart_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cart" ON public.cart_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cart" ON public.cart_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cart" ON public.cart_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Pedidos: cada usuario gestiona los suyos
CREATE POLICY "Users select own orders" ON public.supply_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own orders" ON public.supply_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own orders" ON public.supply_orders FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own orders" ON public.supply_orders FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Ítems del pedido: ligados al pedido (mismo dueño)
CREATE POLICY "Users select own order items"
  ON public.supply_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.supply_orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Users insert own order items"
  ON public.supply_order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.supply_orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Users delete own order items"
  ON public.supply_order_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.supply_orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- Reglas de recomendación: lectura autenticados
CREATE POLICY "Authenticated read rules"
  ON public.product_recommendation_rules FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage rules"
  ON public.product_recommendation_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Interacciones: cada usuario inserta/lee las suyas
CREATE POLICY "Users select own interactions"
  ON public.product_interactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own interactions"
  ON public.product_interactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- Order number generator + auto-sponsor on profile creation
-- =========================================================================
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  ts TEXT;
  rnd TEXT;
BEGIN
  ts := to_char(now(), 'YYYYMMDD-HH24MISS');
  rnd := upper(substr(md5(random()::text), 1, 4));
  RETURN 'CT-' || ts || '-' || rnd;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;

-- Trigger: cuando se crea un perfil, asignar sponsor demo activo (si existe)
CREATE OR REPLACE FUNCTION public.assign_default_sponsor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_lab UUID;
BEGIN
  SELECT id INTO default_lab FROM public.labs WHERE is_active = true ORDER BY created_at ASC LIMIT 1;
  IF default_lab IS NOT NULL THEN
    INSERT INTO public.user_lab_sponsors (user_id, lab_id, is_active)
    VALUES (NEW.user_id, default_lab, true)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.assign_default_sponsor() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS assign_sponsor_after_profile ON public.profiles;
CREATE TRIGGER assign_sponsor_after_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_sponsor();