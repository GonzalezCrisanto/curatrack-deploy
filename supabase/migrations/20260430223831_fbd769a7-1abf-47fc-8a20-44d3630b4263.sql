CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
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