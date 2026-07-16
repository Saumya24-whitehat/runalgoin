
CREATE OR REPLACE FUNCTION public.get_club_chat_teaser()
RETURNS TABLE (
  id uuid,
  body text,
  image_url text,
  created_at timestamptz,
  user_id uuid,
  author_name text,
  is_admin boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      m.id,
      m.body,
      m.image_url,
      m.created_at,
      m.user_id,
      COALESCE(p.name, 'Member') AS author_name,
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = m.user_id AND ur.role = 'admin'
      ) AS is_admin,
      (m.created_at AT TIME ZONE 'Asia/Kolkata')::date AS day,
      ROW_NUMBER() OVER (
        PARTITION BY (m.created_at AT TIME ZONE 'Asia/Kolkata')::date
        ORDER BY m.created_at DESC
      ) AS rn
    FROM public.club_chat_messages m
    LEFT JOIN public.profiles p ON p.user_id = m.user_id
    WHERE m.deleted_at IS NULL
      AND m.created_at >= (now() - interval '7 days')
  ),
  days AS (
    SELECT DISTINCT day FROM ranked ORDER BY day DESC LIMIT 3
  )
  SELECT r.id, r.body, r.image_url, r.created_at, r.user_id, r.author_name, r.is_admin
  FROM ranked r
  JOIN days d ON d.day = r.day
  WHERE r.rn <= 2
  ORDER BY r.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_club_chat_teaser() TO anon, authenticated;
