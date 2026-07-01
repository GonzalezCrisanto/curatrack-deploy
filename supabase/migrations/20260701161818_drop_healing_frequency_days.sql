-- Remove the legacy healing-frequency concept.
-- This column was never correctly used: the app wrote `healing_frequency` (text)
-- while the actual column was `healing_frequency_days` (int4), a name/type mismatch
-- that made every save fail silently. The feature is removed rather than fixed.
ALTER TABLE public.evolutions DROP COLUMN IF EXISTS healing_frequency_days;
