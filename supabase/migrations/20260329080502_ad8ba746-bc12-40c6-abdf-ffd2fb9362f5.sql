
CREATE TABLE public.special_trading_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  type text NOT NULL DEFAULT 'trading_day',
  description text,
  trading_hours text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(date)
);

ALTER TABLE public.special_trading_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view special trading days"
  ON public.special_trading_days FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Only admins can insert special trading days"
  ON public.special_trading_days FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update special trading days"
  ON public.special_trading_days FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete special trading days"
  ON public.special_trading_days FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
