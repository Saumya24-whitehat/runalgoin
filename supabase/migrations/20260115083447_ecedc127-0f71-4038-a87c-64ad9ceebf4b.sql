-- Create saved_strategies table
CREATE TABLE public.saved_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'Custom',
  source TEXT NOT NULL CHECK (source IN ('builder', 'simulator')),
  symbol TEXT NOT NULL,
  positions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_strategies ENABLE ROW LEVEL SECURITY;

-- Users can only see their own strategies
CREATE POLICY "Users can view own strategies"
ON public.saved_strategies
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own strategies
CREATE POLICY "Users can create own strategies"
ON public.saved_strategies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own strategies
CREATE POLICY "Users can update own strategies"
ON public.saved_strategies
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own strategies
CREATE POLICY "Users can delete own strategies"
ON public.saved_strategies
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_saved_strategies_updated_at
BEFORE UPDATE ON public.saved_strategies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_saved_strategies_user_id ON public.saved_strategies(user_id);
CREATE INDEX idx_saved_strategies_source ON public.saved_strategies(source);