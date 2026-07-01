-- =============================================================================
-- NUEVABD.sql — CuraTrack complete database from scratch
-- Paste this into the Supabase SQL Editor on a fresh project.
--
-- What this file does:
--   1. Enable required extensions
--   2. Create the app_role enum
--   3. Create all utility functions (update_updated_at, has_role, handle_new_user)
--   4. Create all tables in dependency order with correct columns, FKs, and constraints
--   5. Enable RLS and apply correct policies (fixes audit bugs 2.5 / mig-28 / mig-29)
--   6. Create triggers
--   7. Create views
--   8. Grant permissions
--   9. Seed labs and sponsors
--
-- Fixes applied from AUDIT.md:
--   [2.5]  RLS INSERT policies use user_id = auth.uid() (not just IS NOT NULL)
--   [2.5]  lab_products: sponsor/admin-scoped policies (not any-authenticated)
--   [2.6]  All FK constraints declared inline
--   [2.7]  user_roles has UNIQUE(user_id) from the start
--   [2.9]  wound_cases.status has CHECK constraint
--   [3.1]  patients has birth_date, allergies, insurance, emergency contact columns
--   [3.2]  evolutions has full clinical columns (pain, exudate, tissue, infection, etc.)
--   [3.7]  wound_cases has ai_summary + ai_summary_updated_at
--   [2.2]  profiles.role removed — canonical role lives in user_roles only
--   [sponsor billing] sponsors has contact_phone, responsible_person, billing_details
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- ENUM
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'professional', 'sponsor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =============================================================================
-- UTILITY FUNCTIONS (no table dependencies)
-- =============================================================================

-- Automatically stamp updated_at on every UPDATE
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;


-- =============================================================================
-- user_roles MUST be created before has_role() so the function body validates
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL DEFAULT 'professional',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- Policies added below after has_role() is defined


-- =============================================================================
-- FUNCTIONS that depend on user_roles
-- =============================================================================

-- Check if a user has a given app role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- Now that has_role() exists, apply user_roles policies
CREATE POLICY "Users read own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create profile + assign professional role on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'professional')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Generate sequential order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
$$;

-- Seed demo clinical data for a user (called from admin panel or RPC)
CREATE OR REPLACE FUNCTION public.seed_demo_patients_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.patients (user_id, first_name, last_name, age, gender, dni, phone, email, address, diagnosis, assigned_professional, observations, admission_date)
  VALUES
    (NEW.user_id, 'Juan Carlos', 'Pérez', 72, 'Masculino', '12.345.678', '+54 11 4567-8901', 'jc.perez@email.com', 'Av. Corrientes 1234, CABA',
      'Diabetes mellitus tipo 2 con complicaciones vasculares. HTA. Movilidad reducida tras ACV isquémico (2023).',
      'Lic. María González', 'Paciente con buena adherencia. Vive con su esposa. Riesgo alto de UPP.', '2026-01-15'),
    (NEW.user_id, 'Marta', 'Vázquez', 65, 'Femenino', '18.765.432', '+54 11 5678-1234', 'marta.vazquez@email.com', 'Calle Florida 567, CABA',
      'Insuficiencia venosa crónica bilateral grado C5 (CEAP). Obesidad. Várices tronculares.',
      'Lic. Ana Martínez', 'Paciente ambulatoria. Buena adherencia al tratamiento compresivo.', '2025-12-01'),
    (NEW.user_id, 'Ricardo', 'López', 45, 'Masculino', '24.567.890', '+54 11 3456-7890', 'ricardo.lopez@email.com', 'Av. Rivadavia 8901, CABA',
      'Post-operatorio de cirugía abdominal compleja. Tabaquismo activo. Sobrepeso.',
      'Dr. Roberto Sánchez', 'Dehiscencia parcial de herida quirúrgica. Deshabituación tabáquica en curso.', '2026-02-20'),
    (NEW.user_id, 'Lucía', 'Fernández', 58, 'Femenino', '20.123.456', '+54 11 6789-2345', 'lucia.fernandez@email.com', 'Av. Santa Fe 2345, CABA',
      'Pie diabético con neuropatía periférica severa. DBT2 mal controlada.',
      'Dr. Carlos Rodríguez', 'Riesgo de amputación. Educación intensiva sobre cuidado de pies.', '2026-02-10'),
    (NEW.user_id, 'Roberto', 'Méndez', 70, 'Masculino', '10.987.654', '+54 11 7890-3456', 'roberto.mendez@email.com', 'Av. Cabildo 4567, CABA',
      'Lesión por presión en talón izquierdo. Inmovilidad por fractura de cadera.',
      'Lic. María González', 'En domicilio con cuidador. Colchón antiescaras.', '2026-03-01'),
    (NEW.user_id, 'Patricia', 'Gómez', 52, 'Femenino', '22.345.678', '+54 11 8901-4567', 'patricia.gomez@email.com', 'Av. Las Heras 3456, CABA',
      'Quemadura de segundo grado en antebrazo derecho. Accidente doméstico.',
      'Lic. Ana Martínez', 'Buena evolución. Cuidados domiciliarios.', '2026-03-15');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.seed_demo_patients_for_user() FROM PUBLIC, anon, authenticated;


-- =============================================================================
-- TABLES — CLINICAL DOMAIN
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles: professional identity, created automatically on signup
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  text NOT NULL DEFAULT '',
  last_name   text NOT NULL DEFAULT '',
  institution text,
  license     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- patients: clinical patients owned by a professional
-- Fix [3.1]: added birth_date, allergies, insurance, emergency contact columns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name              text NOT NULL,
  last_name               text NOT NULL,
  age                     integer,
  birth_date              date,                -- [fix 3.1] replaces age in the long run
  gender                  text,
  dni                     text,
  phone                   text,
  email                   text,
  address                 text,
  diagnosis               text,
  assigned_professional   text,                -- free text, see audit 2.8
  treating_doctor_name    text,                -- [mig-27] treating physician name
  treating_doctor_phone   text,                -- [mig-27] treating physician phone
  observations            text,
  allergies               text,                -- [fix 3.1]
  insurance               text,                -- [fix 3.1]
  emergency_contact_name  text,                -- [fix 3.1]
  emergency_contact_phone text,                -- [fix 3.1]
  admission_date          date,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Restrictive: sponsors can never touch clinical data (Ley 25.326)
CREATE POLICY "Sponsors denied on patients"
  ON public.patients AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'sponsor'::app_role))
  WITH CHECK (NOT has_role(auth.uid(), 'sponsor'::app_role));

CREATE POLICY "Users read own patients"
  ON public.patients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own patients"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);       -- [fix 2.5] was: IS NOT NULL

CREATE POLICY "Users update own patients"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own patients"
  ON public.patients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- wound_cases: wound episodes per patient
-- Fix [2.9]: status CHECK constraint
-- Fix [3.7]: ai_summary columns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wound_cases (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id           uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  wound_type           text NOT NULL,
  anatomical_location  text,
  size                 text,
  depth                text,
  exudate              text,
  infection            text,
  pain                 text,
  treatment            text,
  status               text NOT NULL DEFAULT 'activo'
                         CHECK (status IN ('activo', 'en_mejoria', 'critico', 'resuelto')),
  start_date           date,
  ai_summary           text,               -- [fix 3.7] persisted AI summary
  ai_summary_updated_at timestamptz,       -- [fix 3.7]
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wound_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors denied on wound_cases"
  ON public.wound_cases AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'sponsor'::app_role))
  WITH CHECK (NOT has_role(auth.uid(), 'sponsor'::app_role));

CREATE POLICY "Users read own cases"
  ON public.wound_cases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own cases"
  ON public.wound_cases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);       -- [fix 2.5]

CREATE POLICY "Users update own cases"
  ON public.wound_cases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own cases"
  ON public.wound_cases FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER wound_cases_updated_at
  BEFORE UPDATE ON public.wound_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- evolutions: clinical evolution records per case
-- Fix [3.2]: added full set of clinical columns that were previously in-memory only
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evolutions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id               uuid NOT NULL REFERENCES public.wound_cases(id) ON DELETE CASCADE,
  evolution_date        date NOT NULL,
  evolution_time        time,
  next_control          date,
  next_control_time     time,              -- [mig-26]
  professional          text,
  procedure             text,
  materials             text,
  description           text,
  observations          text,
  healing_frequency     text,
  -- Rich clinical fields [fix 3.2] — were in-memory only, now persisted
  pain_level            integer CHECK (pain_level BETWEEN 0 AND 10),
  odor                  text,
  exudate_amount        text,
  exudate_type          text,
  exudate_color         text,
  tissue_types          text[],
  edge_types            text[],
  wound_length          numeric,
  wound_width           numeric,
  wound_depth           numeric,
  has_infection_signs   boolean DEFAULT false,
  inf_redness           boolean DEFAULT false,
  inf_heat              boolean DEFAULT false,
  inf_swelling          boolean DEFAULT false,
  inf_purulent          boolean DEFAULT false,
  inf_odor              boolean DEFAULT false,
  inf_fever             boolean DEFAULT false,
  body_temperature      numeric,
  evolution_status      text,
  requires_medical_order boolean DEFAULT false,
  medical_order         text,
  closed_at             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors denied on evolutions"
  ON public.evolutions AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'sponsor'::app_role))
  WITH CHECK (NOT has_role(auth.uid(), 'sponsor'::app_role));

CREATE POLICY "Users read own evolutions"
  ON public.evolutions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own evolutions"
  ON public.evolutions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);       -- [fix 2.5]

CREATE POLICY "Users update own evolutions"
  ON public.evolutions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own evolutions"
  ON public.evolutions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER evolutions_updated_at
  BEFORE UPDATE ON public.evolutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- turnos: standalone appointments per wound_case
-- Only base states ('programado', 'cancelado') are stored; 'completado'/'vencido'
-- are derived on-read client-side (see src/lib/appointments.ts deriveTurnoStatus)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.turnos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  case_id        uuid NOT NULL REFERENCES public.wound_cases(id) ON DELETE CASCADE,
  patient_id     uuid NOT NULL REFERENCES public.patients(id)  ON DELETE CASCADE, -- query convenience for agenda
  scheduled_date date NOT NULL,
  scheduled_time time,
  status         text NOT NULL DEFAULT 'programado'
                   CHECK (status IN ('programado', 'cancelado')), -- only base states are stored
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors denied on turnos"
  ON public.turnos AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT has_role(auth.uid(), 'sponsor'::app_role))
  WITH CHECK (NOT has_role(auth.uid(), 'sponsor'::app_role));

CREATE POLICY "Users read own turnos"   ON public.turnos FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own turnos" ON public.turnos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own turnos" ON public.turnos FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own turnos" ON public.turnos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER turnos_updated_at BEFORE UPDATE ON public.turnos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_turnos_user_id        ON public.turnos(user_id);
CREATE INDEX IF NOT EXISTS idx_turnos_case_id        ON public.turnos(case_id);
CREATE INDEX IF NOT EXISTS idx_turnos_patient_id     ON public.turnos(patient_id);
CREATE INDEX IF NOT EXISTS idx_turnos_scheduled_date ON public.turnos(scheduled_date);

-- ---------------------------------------------------------------------------
-- photos: clinical photos linked to cases and evolutions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id      uuid REFERENCES public.wound_cases(id) ON DELETE CASCADE,
  evolution_id uuid REFERENCES public.evolutions(id) ON DELETE SET NULL,
  url          text NOT NULL,
  caption      text,
  photo_date   date,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own photos"
  ON public.photos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own photos"
  ON public.photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);       -- [fix 2.5]

CREATE POLICY "Users update own photos"
  ON public.photos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own photos"
  ON public.photos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- patient_consents: patient consent records per professional
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id                uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  status                    text NOT NULL DEFAULT 'pending',
  consent_version           text NOT NULL DEFAULT '1.0',
  accepts_digital_record    boolean NOT NULL DEFAULT false,
  accepts_clinical_photos   boolean NOT NULL DEFAULT false,
  accepts_wound_tracking    boolean NOT NULL DEFAULT false,
  accepts_digital_reports   boolean NOT NULL DEFAULT false,
  signer_full_name          text,
  signer_dni                text,
  signer_relationship       text,
  signer_relationship_other text,
  signature_url             text,
  signed_at                 timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors denied on patient_consents"
  ON public.patient_consents AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'sponsor'::app_role))
  WITH CHECK (NOT has_role(auth.uid(), 'sponsor'::app_role));

CREATE POLICY "Users read own consents"
  ON public.patient_consents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own consents"
  ON public.patient_consents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);       -- [fix 2.5]

CREATE POLICY "Users update own consents"
  ON public.patient_consents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER patient_consents_updated_at
  BEFORE UPDATE ON public.patient_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- evolution_signatures: legal signatures per evolution
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evolution_signatures (
  id                             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evolution_id                   uuid NOT NULL REFERENCES public.evolutions(id) ON DELETE CASCADE,
  case_id                        uuid NOT NULL REFERENCES public.wound_cases(id) ON DELETE CASCADE,
  patient_id                     uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_confirmation      boolean NOT NULL DEFAULT false,
  professional_signature_url     text,
  professional_signed_at         timestamptz,
  patient_consent_status         text NOT NULL DEFAULT 'pending',
  patient_accepts_photos         boolean,
  patient_consent_observation    text,
  patient_signer_full_name       text,
  patient_signer_dni             text,
  patient_signer_relationship    text,
  patient_signer_relationship_other text,
  patient_signature_url          text,
  patient_signed_at              timestamptz,
  created_at                     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evolution_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors denied on evolution_signatures"
  ON public.evolution_signatures AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'sponsor'::app_role))
  WITH CHECK (NOT has_role(auth.uid(), 'sponsor'::app_role));

CREATE POLICY "Users read own evolution signatures"
  ON public.evolution_signatures FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own evolution signatures"
  ON public.evolution_signatures FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);       -- [fix 2.5]


-- =============================================================================
-- TABLES — MARKETPLACE DOMAIN
-- =============================================================================

-- ---------------------------------------------------------------------------
-- labs: pharmaceutical laboratories / suppliers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  description   text,
  logo_url      text,
  website       text,
  contact_email text,
  contact_phone text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active labs"
  ON public.labs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage labs"
  ON public.labs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER labs_updated_at
  BEFORE UPDATE ON public.labs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- product_categories: product classification
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  icon        text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read product categories"
  ON public.product_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins manage product categories"
  ON public.product_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- user_lab_sponsors: which lab a professional/sponsor belongs to
-- Must be created before lab_products (its RLS policies reference this table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_lab_sponsors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_id      uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  is_active   boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lab_id)
);

ALTER TABLE public.user_lab_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own lab assignments"
  ON public.user_lab_sponsors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage lab assignments"
  ON public.user_lab_sponsors FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- lab_products: product catalog per lab
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_products (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id             uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  category_id        uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name               text NOT NULL,
  short_description  text,
  description        text,
  sku                text,
  presentation       text,
  size               text,
  price              numeric,
  currency           text NOT NULL DEFAULT 'ARS',
  stock              integer,
  min_stock          integer,
  units_per_box      integer,
  image_url          text,
  datasheet_url      text,
  usage_instructions text,
  wound_types        text[] NOT NULL DEFAULT '{}',
  clinical_tags      text[] NOT NULL DEFAULT '{}',
  is_active          boolean NOT NULL DEFAULT true,
  is_featured        boolean NOT NULL DEFAULT false,
  price_updated_at   timestamptz NOT NULL DEFAULT now(),
  price_valid_until  timestamptz,
  stock_updated_at   timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_products ENABLE ROW LEVEL SECURITY;

-- Admins: full control
CREATE POLICY "Admins manage lab products"
  ON public.lab_products FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Professionals: read active products from their assigned lab
CREATE POLICY "Professionals read products in own lab"
  ON public.lab_products FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND has_role(auth.uid(), 'professional'::app_role)
    AND lab_id IN (
      SELECT uls.lab_id FROM public.user_lab_sponsors uls
      WHERE uls.user_id = auth.uid() AND uls.is_active = true
    )
  );

-- Sponsors: read/write products in own lab  [fix 2.5 / mig-29]
CREATE POLICY "Sponsors read products in own lab"
  ON public.lab_products FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sponsor'::app_role)
    AND lab_id IN (
      SELECT uls.lab_id FROM public.user_lab_sponsors uls
      WHERE uls.user_id = auth.uid() AND uls.is_active = true
    )
  );

CREATE POLICY "Sponsors insert products in own lab"
  ON public.lab_products FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'sponsor'::app_role)
    AND lab_id IN (
      SELECT uls.lab_id FROM public.user_lab_sponsors uls
      WHERE uls.user_id = auth.uid() AND uls.is_active = true
    )
  );

CREATE POLICY "Sponsors update products in own lab"
  ON public.lab_products FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'sponsor'::app_role)
    AND lab_id IN (
      SELECT uls.lab_id FROM public.user_lab_sponsors uls
      WHERE uls.user_id = auth.uid() AND uls.is_active = true
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'sponsor'::app_role)
    AND lab_id IN (
      SELECT uls.lab_id FROM public.user_lab_sponsors uls
      WHERE uls.user_id = auth.uid() AND uls.is_active = true
    )
  );

CREATE TRIGGER lab_products_updated_at
  BEFORE UPDATE ON public.lab_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- lab_sellers: sales reps per lab
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_sellers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id     uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text NOT NULL,
  email      text,
  phone      text,
  whatsapp   text,
  zone       text,
  avatar_url text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lab sellers"
  ON public.lab_sellers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers read own record"
  ON public.lab_sellers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER lab_sellers_updated_at
  BEFORE UPDATE ON public.lab_sellers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- supply_orders: professional purchase orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supply_orders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- preserve history
  lab_id                uuid REFERENCES public.labs(id) ON DELETE SET NULL,
  seller_id             uuid REFERENCES public.lab_sellers(id) ON DELETE SET NULL,
  order_number          text NOT NULL UNIQUE DEFAULT public.generate_order_number(),
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  channel               text,
  professional_name     text,
  institution           text,
  delivery_address      text,
  delivery_city         text,
  delivery_postal_code  text,
  delivery_notes        text,
  contact_phone         text,
  contact_email         text,
  general_wound_type    text,
  clinical_recommendation text,
  commercial_notes      text,
  estimated_total       numeric,
  currency              text NOT NULL DEFAULT 'ARS',
  sent_at               timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supply_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own orders"
  ON public.supply_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own orders"
  ON public.supply_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own orders"
  ON public.supply_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete orders"
  ON public.supply_orders FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER supply_orders_updated_at
  BEFORE UPDATE ON public.supply_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- supply_order_items: line items per order
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supply_order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES public.supply_orders(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES public.lab_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_sku  text,
  presentation text,
  quantity     integer NOT NULL,
  unit_price   numeric,
  subtotal     numeric,
  currency     text NOT NULL DEFAULT 'ARS',
  priority     text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supply_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own order items"
  ON public.supply_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supply_orders o
      WHERE o.id = order_id AND (o.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Users insert own order items"
  ON public.supply_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supply_orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- cart_items: persistent cart (currently unused — app uses localStorage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id          uuid NOT NULL REFERENCES public.lab_products(id) ON DELETE CASCADE,
  quantity            integer NOT NULL DEFAULT 1,
  priority            text NOT NULL DEFAULT 'normal',
  notes               text,
  curation_date       date,
  related_case_id     uuid REFERENCES public.wound_cases(id) ON DELETE SET NULL,
  related_evolution_id uuid REFERENCES public.evolutions(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cart"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- seller_assignments: rep-to-professional assignments (currently unused)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seller_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id   uuid NOT NULL REFERENCES public.lab_sellers(id) ON DELETE CASCADE,
  lab_id      uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  institution text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own seller assignments"
  ON public.seller_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage seller assignments"
  ON public.seller_assignments FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- product_clinical_tags: clinical tag taxonomy (currently unused)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_clinical_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_clinical_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read clinical tags"
  ON public.product_clinical_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins manage clinical tags"
  ON public.product_clinical_tags FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- product_recommendation_rules: recommendation engine rules (currently unused)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_recommendation_rules (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name                text NOT NULL,
  match_wound_type         text,
  match_exudate            text,
  match_infection          boolean,
  match_clinical_tag       text,
  recommended_category_slug text,
  recommended_clinical_tag text,
  priority                 integer NOT NULL DEFAULT 0,
  is_active                boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_recommendation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage recommendation rules"
  ON public.product_recommendation_rules FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- product_interactions: product view/click tracking (currently unused)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_interactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id       uuid NOT NULL REFERENCES public.lab_products(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  context          text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own interactions"
  ON public.product_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all interactions"
  ON public.product_interactions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sponsors read interactions in own lab"
  ON public.product_interactions FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sponsor'::app_role)
    AND product_id IN (
      SELECT lp.id FROM public.lab_products lp
      WHERE lp.lab_id IN (
        SELECT uls.lab_id FROM public.user_lab_sponsors uls
        WHERE uls.user_id = auth.uid() AND uls.is_active = true
      )
    )
  );


-- =============================================================================
-- TABLES — SPONSOR / WHITE-LABEL DOMAIN
-- =============================================================================

-- ---------------------------------------------------------------------------
-- sponsors: white-label branding configuration per lab
-- Fix: added contact_phone, responsible_person, billing_details columns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sponsors (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text NOT NULL UNIQUE,
  sponsor_name       text NOT NULL,
  app_name           text NOT NULL,
  logo_url           text,
  primary_color      text NOT NULL DEFAULT '#00965E',
  secondary_color    text NOT NULL DEFAULT '#1763D2',
  accent_color       text NOT NULL DEFAULT '#22C55E',
  catalog_name       text NOT NULL DEFAULT 'Catálogo clínico',
  sponsor_label      text NOT NULL DEFAULT 'Laboratorio sponsor',
  support_email      text,
  sales_contact_label text DEFAULT 'Contactar al vendedor',
  powered_by_label   text,
  legal_footer       text,
  lab_id             uuid REFERENCES public.labs(id) ON DELETE SET NULL,
  -- billing / admin fields (restricted by RLS to own sponsor)
  contact_phone      text,
  responsible_person text,
  billing_details    text,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
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

-- NOTE: "Sponsors update own sponsor settings" policy added after user_sponsor table

CREATE TRIGGER sponsors_updated_at
  BEFORE UPDATE ON public.sponsors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- user_sponsor: user-to-sponsor mapping for sponsor-role users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_sponsor (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Now that user_sponsor exists, add the sponsors UPDATE policy that references it
CREATE POLICY "Sponsors update own sponsor settings"
  ON public.sponsors FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'sponsor'::app_role)
    AND (
      id IN (SELECT us.sponsor_id FROM public.user_sponsor us WHERE us.user_id = auth.uid())
      OR lab_id IN (
        SELECT uls.lab_id FROM public.user_lab_sponsors uls
        WHERE uls.user_id = auth.uid() AND uls.is_active = true
      )
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'sponsor'::app_role)
    AND (
      id IN (SELECT us.sponsor_id FROM public.user_sponsor us WHERE us.user_id = auth.uid())
      OR lab_id IN (
        SELECT uls.lab_id FROM public.user_lab_sponsors uls
        WHERE uls.user_id = auth.uid() AND uls.is_active = true
      )
    )
  );


-- =============================================================================
-- VIEWS
-- =============================================================================

-- Public-safe view of lab_sellers (no PII like email/phone)
CREATE OR REPLACE VIEW public.lab_sellers_public AS
SELECT
  id,
  lab_id,
  full_name,
  zone,
  avatar_url,
  is_active,
  created_at,
  updated_at
FROM public.lab_sellers;


-- =============================================================================
-- SPONSOR-SAFE RPCs (anonymized data for sponsor analytics)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_sponsor_orders_anon(
  p_period_days integer DEFAULT NULL
)
RETURNS TABLE (
  id                   uuid,
  order_number         text,
  status               text,
  created_at           timestamptz,
  sent_at              timestamptz,
  institution          text,
  general_wound_type   text,
  estimated_total      numeric,
  currency             text,
  channel              text,
  anonymized_case_code text
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
    COALESCE(NULLIF(o.general_wound_type, ''), 'Sin clasificar')       AS general_wound_type,
    o.estimated_total,
    COALESCE(o.currency, 'ARS')                                        AS currency,
    o.channel,
    'CASO-' || UPPER(SUBSTRING(md5(o.id::text), 1, 8))                AS anonymized_case_code
  FROM public.supply_orders o
  WHERE o.lab_id IN (
    SELECT uls.lab_id FROM public.user_lab_sponsors uls
    WHERE uls.user_id = auth.uid() AND uls.is_active = true
  )
  AND (p_period_days IS NULL OR o.created_at >= (now() - make_interval(days => p_period_days)))
  ORDER BY o.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_sponsor_orders_anon(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_sponsor_order_items_anon(
  p_order_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id           uuid,
  order_id     uuid,
  product_id   uuid,
  product_name text,
  product_sku  text,
  presentation text,
  quantity     integer,
  unit_price   numeric,
  subtotal     numeric,
  currency     text
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
    SELECT uls.lab_id FROM public.user_lab_sponsors uls
    WHERE uls.user_id = auth.uid() AND uls.is_active = true
  )
  AND (p_order_ids IS NULL OR soi.order_id = ANY(p_order_ids))
  ORDER BY soi.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_sponsor_order_items_anon(uuid[]) TO authenticated;


-- =============================================================================
-- AUTH TRIGGER — create profile + role on signup
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS seed_demo_patients_after_profile ON public.profiles;
CREATE TRIGGER seed_demo_patients_after_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.seed_demo_patients_for_user();


-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT                         ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;

-- Ensure future tables inherit the same grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, anon, service_role;


-- =============================================================================
-- STORAGE
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signatures', 'signatures', false, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text);


-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_patients_user_id       ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_wound_cases_user_id    ON public.wound_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_wound_cases_patient_id ON public.wound_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_evolutions_user_id     ON public.evolutions(user_id);
CREATE INDEX IF NOT EXISTS idx_evolutions_case_id     ON public.evolutions(case_id);
CREATE INDEX IF NOT EXISTS idx_photos_case_id         ON public.photos(case_id);
CREATE INDEX IF NOT EXISTS idx_photos_evolution_id    ON public.photos(evolution_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id     ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lab_sponsors_user ON public.user_lab_sponsors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lab_sponsors_lab  ON public.user_lab_sponsors(lab_id);
CREATE INDEX IF NOT EXISTS idx_supply_orders_user_id  ON public.supply_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_supply_orders_lab_id   ON public.supply_orders(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_products_lab_id    ON public.lab_products(lab_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient ON public.patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_evo_signatures_evolution ON public.evolution_signatures(evolution_id);


-- =============================================================================
-- SEED DATA — labs and sponsors
-- =============================================================================

INSERT INTO public.labs (slug, name, description, is_active)
VALUES
  ('bbraun',  'B. Braun',          'B. Braun Medical — Insumos para curación avanzada de heridas.', true),
  ('convatec', 'Convatec',         'Convatec — Soluciones para el cuidado de heridas crónicas y ostomías.', true),
  ('demo',    'Laboratorio Demo',  'Laboratorio de demostración para presentaciones comerciales.', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.sponsors (slug, sponsor_name, app_name, primary_color, secondary_color, accent_color, catalog_name, sponsor_label, support_email, legal_footer, lab_id, is_active)
SELECT 'bbraun', 'B. Braun', 'B. Braun CuraTrack',
       '#00965E', '#003D2C', '#22C55E',
       'Catálogo clínico B. Braun', 'Programa B. Braun',
       'soporte@bbraun-platform.com',
       'Plataforma clínica del programa de acompañamiento B. Braun. Datos clínicos protegidos. Métricas para sponsor agregadas y anonimizadas.',
       (SELECT id FROM public.labs WHERE slug = 'bbraun'), true
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.sponsors (slug, sponsor_name, app_name, primary_color, secondary_color, accent_color, catalog_name, sponsor_label, support_email, legal_footer, lab_id, is_active)
SELECT 'convatec', 'Convatec', 'Convatec Wound Care Hub',
       '#E11D48', '#7F1D1D', '#F472B6',
       'Catálogo clínico Convatec', 'Programa Convatec',
       'soporte@convatec-hub.com',
       'Plataforma clínica del programa de acompañamiento Convatec. Datos clínicos protegidos. Métricas para sponsor agregadas y anonimizadas.',
       (SELECT id FROM public.labs WHERE slug = 'convatec'), true
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.sponsors (slug, sponsor_name, app_name, primary_color, secondary_color, accent_color, catalog_name, sponsor_label, support_email, legal_footer, lab_id, is_active)
SELECT 'demo', 'Laboratorio Demo', 'CuraTrack',
       '#1763D2', '#0F172A', '#3B82F6',
       'Catálogo clínico demo', 'Programa Sponsor',
       'soporte@care-platform.demo',
       'Plataforma clínica white-label de demostración. Datos clínicos protegidos. Métricas para sponsor agregadas y anonimizadas.',
       (SELECT id FROM public.labs WHERE slug = 'demo'), true
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- SEED DATA — demo users
-- =============================================================================

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  phone_change, phone_change_token,
  created_at, updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo.pro@curatrack.app',
    crypt('DemoPro2024!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Demo","last_name":"Profesional"}'::jsonb,
    '', '', '', '', '', '',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo.sponsor@curatrack.app',
    crypt('DemoSponsor2024!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Demo","last_name":"Sponsor"}'::jsonb,
    '', '', '', '', '', '',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo.admin@curatrack.app',
    crypt('DemoAdmin2024!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Demo","last_name":"Admin"}'::jsonb,
    '', '', '', '', '', '',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
VALUES
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    format('{"sub":"%s","email":"demo.pro@curatrack.app"}', '00000000-0000-0000-0000-000000000001')::jsonb,
    'email', 'demo.pro@curatrack.app', now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000002',
    format('{"sub":"%s","email":"demo.sponsor@curatrack.app"}', '00000000-0000-0000-0000-000000000002')::jsonb,
    'email', 'demo.sponsor@curatrack.app', now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000003',
    format('{"sub":"%s","email":"demo.admin@curatrack.app"}', '00000000-0000-0000-0000-000000000003')::jsonb,
    'email', 'demo.admin@curatrack.app', now(), now(), now()
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'professional'),
  ('00000000-0000-0000-0000-000000000002', 'sponsor'),
  ('00000000-0000-0000-0000-000000000003', 'admin')
ON CONFLICT (user_id) DO NOTHING;
