-- Additional sponsor branding/profile fields for role-based configuration
ALTER TABLE public.sponsors
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS responsible_person TEXT,
  ADD COLUMN IF NOT EXISTS billing_details TEXT;
