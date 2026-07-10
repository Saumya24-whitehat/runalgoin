
-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  method TEXT,
  email TEXT,
  contact TEXT,
  refund_id TEXT,
  refund_amount INTEGER,
  refunded_at TIMESTAMPTZ,
  notes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (razorpay_order_id)
);
CREATE INDEX idx_payments_user ON public.payments(user_id, created_at DESC);
CREATE INDEX idx_payments_payment_id ON public.payments(razorpay_payment_id);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all payments" ON public.payments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  customer_email TEXT,
  customer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_user ON public.invoices(user_id, created_at DESC);

GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own invoices" ON public.invoices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all invoices" ON public.invoices
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Subscription audit log
CREATE TABLE public.subscription_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  old_plan TEXT,
  new_plan TEXT,
  old_status TEXT,
  new_status TEXT,
  expires_at TIMESTAMPTZ,
  reason TEXT,
  actor TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_user ON public.subscription_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_created ON public.subscription_audit_log(created_at DESC);

GRANT SELECT ON public.subscription_audit_log TO authenticated;
GRANT ALL ON public.subscription_audit_log TO service_role;
ALTER TABLE public.subscription_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit log" ON public.subscription_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger for payments
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
