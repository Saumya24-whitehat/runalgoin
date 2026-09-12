CREATE TABLE public.trade_journal (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  symbol text NOT NULL,
  expiry_date date,
  expiry_type text NOT NULL DEFAULT 'weekly',
  strike numeric,
  option_type text NOT NULL DEFAULT 'CE',
  side text NOT NULL DEFAULT 'buy',
  lots integer NOT NULL DEFAULT 1,
  qty_per_lot integer NOT NULL DEFAULT 1,
  entry_premium numeric NOT NULL DEFAULT 0,
  exit_premium numeric,
  entry_time timestamp with time zone,
  exit_time timestamp with time zone,
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_journal TO authenticated;
GRANT ALL ON public.trade_journal TO service_role;

ALTER TABLE public.trade_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own journal entries"
ON public.trade_journal FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_trade_journal_updated_at
BEFORE UPDATE ON public.trade_journal
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_trade_journal_user_date ON public.trade_journal(user_id, trade_date DESC);