CREATE TABLE public.trial_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trial_claims TO authenticated;
GRANT ALL ON public.trial_claims TO service_role;
ALTER TABLE public.trial_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own trial claim" ON public.trial_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all trial claims" ON public.trial_claims FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_trial_claims_fingerprint ON public.trial_claims(fingerprint);
CREATE INDEX idx_trial_claims_ip ON public.trial_claims(ip_address);
CREATE INDEX idx_trial_claims_user ON public.trial_claims(user_id);