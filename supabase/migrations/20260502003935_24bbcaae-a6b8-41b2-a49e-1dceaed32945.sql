
-- Patient general consent table
CREATE TABLE public.patient_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  user_id uuid NOT NULL,
  consent_version text NOT NULL DEFAULT 'v1.0',
  accepts_digital_record boolean NOT NULL DEFAULT false,
  accepts_clinical_photos boolean NOT NULL DEFAULT false,
  accepts_wound_tracking boolean NOT NULL DEFAULT false,
  accepts_digital_reports boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  signer_full_name text,
  signer_dni text,
  signer_relationship text,
  signer_relationship_other text,
  signature_url text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view consents of own patients"
ON public.patient_consents FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert consents for own patients"
ON public.patient_consents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update consents of own patients"
ON public.patient_consents FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_patient_consents_updated_at
BEFORE UPDATE ON public.patient_consents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Evolution signatures table
CREATE TABLE public.evolution_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evolution_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  case_id uuid NOT NULL,
  user_id uuid NOT NULL,
  professional_confirmation boolean NOT NULL DEFAULT false,
  professional_signature_url text,
  professional_signed_at timestamptz,
  patient_consent_status text NOT NULL DEFAULT 'pending',
  patient_accepts_photos boolean DEFAULT true,
  patient_signer_full_name text,
  patient_signer_dni text,
  patient_signer_relationship text,
  patient_signer_relationship_other text,
  patient_signature_url text,
  patient_signed_at timestamptz,
  patient_consent_observation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evolution_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evolution signatures"
ON public.evolution_signatures FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evolution signatures"
ON public.evolution_signatures FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Signatures storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own signatures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own signatures"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);
