
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('free','pro','club','enterprise'));

CREATE OR REPLACE FUNCTION public.is_club_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.plan_type IN ('club','enterprise')
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > now())
  ) OR public.has_role(_user_id, 'admin');
$$;

CREATE TABLE public.club_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.club_categories TO authenticated;
GRANT ALL ON public.club_categories TO service_role;
ALTER TABLE public.club_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members can read categories" ON public.club_categories
  FOR SELECT TO authenticated USING (public.is_club_member(auth.uid()));
CREATE POLICY "Admins manage categories" ON public.club_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.club_categories (name, slug, sort_order) VALUES
  ('General Chat', 'general', 0),
  ('Momentum Investing', 'momentum', 1),
  ('Short Term Trading', 'short-term', 2),
  ('Long Term Investing', 'long-term', 3),
  ('Technical Club', 'technical', 4);

CREATE TABLE public.club_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.club_categories(id) ON DELETE CASCADE,
  body text NOT NULL,
  image_url text,
  idea_type text,
  action text,
  exchange text,
  symbol text,
  cmp numeric,
  entry_zone text,
  stop_loss numeric,
  target1 numeric,
  timeframe text,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX club_posts_category_created_idx ON public.club_posts (category_id, created_at DESC);
CREATE INDEX club_posts_user_idx ON public.club_posts (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_posts TO authenticated;
GRANT ALL ON public.club_posts TO service_role;
ALTER TABLE public.club_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members read posts" ON public.club_posts
  FOR SELECT TO authenticated USING (public.is_club_member(auth.uid()) AND deleted_at IS NULL);
CREATE POLICY "Club members create own posts" ON public.club_posts
  FOR INSERT TO authenticated WITH CHECK (public.is_club_member(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users update own posts" ON public.club_posts
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users delete own posts" ON public.club_posts
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_club_posts_updated_at BEFORE UPDATE ON public.club_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.club_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.club_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.club_post_likes TO authenticated;
GRANT ALL ON public.club_post_likes TO service_role;
ALTER TABLE public.club_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members read likes" ON public.club_post_likes
  FOR SELECT TO authenticated USING (public.is_club_member(auth.uid()));
CREATE POLICY "Club members like as self" ON public.club_post_likes
  FOR INSERT TO authenticated WITH CHECK (public.is_club_member(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users unlike own" ON public.club_post_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.club_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.club_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX club_post_comments_post_idx ON public.club_post_comments (post_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_post_comments TO authenticated;
GRANT ALL ON public.club_post_comments TO service_role;
ALTER TABLE public.club_post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members read comments" ON public.club_post_comments
  FOR SELECT TO authenticated USING (public.is_club_member(auth.uid()) AND deleted_at IS NULL);
CREATE POLICY "Club members comment as self" ON public.club_post_comments
  FOR INSERT TO authenticated WITH CHECK (public.is_club_member(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users update own comments" ON public.club_post_comments
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users delete own comments" ON public.club_post_comments
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.club_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.club_categories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  image_url text,
  reply_to_id uuid REFERENCES public.club_chat_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX club_chat_category_created_idx ON public.club_chat_messages (category_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_chat_messages TO authenticated;
GRANT ALL ON public.club_chat_messages TO service_role;
ALTER TABLE public.club_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members read chat" ON public.club_chat_messages
  FOR SELECT TO authenticated USING (public.is_club_member(auth.uid()) AND deleted_at IS NULL);
CREATE POLICY "Club members send chat as self" ON public.club_chat_messages
  FOR INSERT TO authenticated WITH CHECK (public.is_club_member(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users update own messages" ON public.club_chat_messages
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users delete own messages" ON public.club_chat_messages
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.club_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.club_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.club_post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.club_post_likes;

ALTER TABLE public.club_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.club_posts REPLICA IDENTITY FULL;
ALTER TABLE public.club_post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.club_post_likes REPLICA IDENTITY FULL;
