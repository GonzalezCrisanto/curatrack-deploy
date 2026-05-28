-- Enforce a single app role per user to avoid contradictory ACL states.
-- Deterministic cleanup rule for legacy duplicates:
-- admin > sponsor > professional, then latest created_at/id.

WITH ranked AS (
  SELECT
    id,
    user_id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE role
          WHEN 'admin' THEN 3
          WHEN 'sponsor' THEN 2
          ELSE 1
        END DESC,
        created_at DESC,
        id DESC
    ) AS rn
  FROM public.user_roles
)
DELETE FROM public.user_roles ur
USING ranked r
WHERE ur.id = r.id
  AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_key'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END
$$;

