-- Patient consent is now captured once at the patient level (patient_consents),
-- not re-collected per evolution. Drop the now-unused patient_* columns from
-- evolution_signatures, which is left tracking only the professional's
-- confirmation and signature.
ALTER TABLE public.evolution_signatures DROP COLUMN IF EXISTS patient_consent_status;
ALTER TABLE public.evolution_signatures DROP COLUMN IF EXISTS patient_accepts_photos;
ALTER TABLE public.evolution_signatures DROP COLUMN IF EXISTS patient_signer_full_name;
ALTER TABLE public.evolution_signatures DROP COLUMN IF EXISTS patient_signer_dni;
ALTER TABLE public.evolution_signatures DROP COLUMN IF EXISTS patient_signer_relationship;
ALTER TABLE public.evolution_signatures DROP COLUMN IF EXISTS patient_signer_relationship_other;
ALTER TABLE public.evolution_signatures DROP COLUMN IF EXISTS patient_signature_url;
ALTER TABLE public.evolution_signatures DROP COLUMN IF EXISTS patient_signed_at;
ALTER TABLE public.evolution_signatures DROP COLUMN IF EXISTS patient_consent_observation;
