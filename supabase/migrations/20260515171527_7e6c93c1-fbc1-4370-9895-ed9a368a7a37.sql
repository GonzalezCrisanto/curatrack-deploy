
-- 1. Sponsors table
CREATE TABLE public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  sponsor_name text NOT NULL,
  app_name text NOT NULL,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#00965E',
  secondary_color text NOT NULL DEFAULT '#1763D2',
  accent_color text NOT NULL DEFAULT '#22C55E',
  catalog_name text NOT NULL DEFAULT 'Catálogo clínico',
  sponsor_label text NOT NULL DEFAULT 'Laboratorio sponsor',
  support_email text,
  sales_contact_label text DEFAULT 'Contactar al vendedor',
  powered_by_label text,
  legal_footer text,
  lab_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active sponsors"
ON public.sponsors FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins manage sponsors"
ON public.sponsors FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER sponsors_updated_at
BEFORE UPDATE ON public.sponsors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. User → sponsor mapping
CREATE TABLE public.user_sponsor (
  user_id uuid PRIMARY KEY,
  sponsor_id uuid NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sponsor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own sponsor mapping"
ON public.user_sponsor FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own sponsor mapping"
ON public.user_sponsor FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sponsor mapping"
ON public.user_sponsor FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own sponsor mapping"
ON public.user_sponsor FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER user_sponsor_updated_at
BEFORE UPDATE ON public.user_sponsor
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Seed labs (idempotent on slug)
INSERT INTO public.labs (slug, name, description, is_active)
VALUES
  ('bbraun', 'B. Braun', 'B. Braun Medical — Insumos para curación avanzada de heridas.', true),
  ('convatec', 'Convatec', 'Convatec — Soluciones para el cuidado de heridas crónicas y ostomías.', true),
  ('demo', 'Laboratorio Demo', 'Laboratorio de demostración para presentaciones comerciales.', true)
ON CONFLICT (slug) DO NOTHING;

-- 4. Seed sponsors linked to those labs
INSERT INTO public.sponsors (slug, sponsor_name, app_name, primary_color, secondary_color, accent_color, catalog_name, sponsor_label, support_email, legal_footer, lab_id, is_active)
SELECT 'bbraun', 'B. Braun', 'B. Braun CuraTrack', '#00965E', '#003D2C', '#22C55E',
       'Catálogo clínico B. Braun', 'Programa B. Braun',
       'soporte@bbraun-platform.com',
       'Plataforma clínica del programa de acompañamiento B. Braun. Datos clínicos protegidos. Métricas para sponsor agregadas y anonimizadas.',
       (SELECT id FROM public.labs WHERE slug='bbraun'), true
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.sponsors (slug, sponsor_name, app_name, primary_color, secondary_color, accent_color, catalog_name, sponsor_label, support_email, legal_footer, lab_id, is_active)
SELECT 'convatec', 'Convatec', 'Convatec Wound Care Hub', '#E11D48', '#7F1D1D', '#F472B6',
       'Catálogo clínico Convatec', 'Programa Convatec',
       'soporte@convatec-hub.com',
       'Plataforma clínica del programa de acompañamiento Convatec. Datos clínicos protegidos. Métricas para sponsor agregadas y anonimizadas.',
       (SELECT id FROM public.labs WHERE slug='convatec'), true
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.sponsors (slug, sponsor_name, app_name, primary_color, secondary_color, accent_color, catalog_name, sponsor_label, support_email, legal_footer, lab_id, is_active)
SELECT 'demo', 'Laboratorio Demo', 'CuraTrack', '#1763D2', '#0F172A', '#3B82F6',
       'Catálogo clínico demo', 'Programa Sponsor',
       'soporte@care-platform.demo',
       'Plataforma clínica white-label de demostración. Datos clínicos protegidos. Métricas para sponsor agregadas y anonimizadas.',
       (SELECT id FROM public.labs WHERE slug='demo'), true
ON CONFLICT (slug) DO NOTHING;
