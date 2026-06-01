ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS treating_doctor_name TEXT,
  ADD COLUMN IF NOT EXISTS treating_doctor_phone TEXT;
