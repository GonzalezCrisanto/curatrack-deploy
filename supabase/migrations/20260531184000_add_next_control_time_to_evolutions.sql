ALTER TABLE public.evolutions
ADD COLUMN IF NOT EXISTS next_control_time time;
