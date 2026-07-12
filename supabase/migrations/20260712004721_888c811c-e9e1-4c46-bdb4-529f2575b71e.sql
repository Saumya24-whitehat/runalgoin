
CREATE TABLE public.momentum_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  week_of DATE NOT NULL,
  content TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.momentum_reports TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.momentum_reports TO authenticated;
GRANT ALL ON public.momentum_reports TO service_role;

ALTER TABLE public.momentum_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view momentum reports"
ON public.momentum_reports FOR SELECT
USING (true);

CREATE POLICY "Admins can insert momentum reports"
ON public.momentum_reports FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update momentum reports"
ON public.momentum_reports FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete momentum reports"
ON public.momentum_reports FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER momentum_reports_updated_at
BEFORE UPDATE ON public.momentum_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX momentum_reports_week_of_idx ON public.momentum_reports (week_of DESC);
