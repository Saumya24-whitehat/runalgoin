
-- Settings table (single row) for subscription expiry reminder days
CREATE TABLE public.subscription_reminder_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  notify_days INTEGER[] NOT NULL DEFAULT ARRAY[7, 3, 1],
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton_row CHECK (id = 1)
);

GRANT SELECT ON public.subscription_reminder_settings TO authenticated;
GRANT ALL ON public.subscription_reminder_settings TO service_role;

ALTER TABLE public.subscription_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view settings"
  ON public.subscription_reminder_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can update settings"
  ON public.subscription_reminder_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
  ON public.subscription_reminder_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Dedupe log so we never send the same threshold reminder twice
CREATE TABLE public.subscription_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  days_before INTEGER NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, expires_at, days_before)
);

GRANT SELECT ON public.subscription_reminder_log TO authenticated;
GRANT ALL ON public.subscription_reminder_log TO service_role;

ALTER TABLE public.subscription_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reminder log"
  ON public.subscription_reminder_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed the singleton row
INSERT INTO public.subscription_reminder_settings (id, notify_days, enabled)
VALUES (1, ARRAY[7, 3, 1], true)
ON CONFLICT (id) DO NOTHING;
