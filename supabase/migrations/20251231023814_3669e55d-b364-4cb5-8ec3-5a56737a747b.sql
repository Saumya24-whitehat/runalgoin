-- Create table_styles table to store admin-configured styles
CREATE TABLE public.table_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_key TEXT UNIQUE NOT NULL DEFAULT 'global',
  light_config JSONB NOT NULL,
  dark_config JSONB NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.table_styles ENABLE ROW LEVEL SECURITY;

-- Everyone can read styles (public access for all users)
CREATE POLICY "Anyone can view table styles"
ON public.table_styles
FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins can insert styles
CREATE POLICY "Only admins can insert table styles"
ON public.table_styles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update styles
CREATE POLICY "Only admins can update table styles"
ON public.table_styles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete styles
CREATE POLICY "Only admins can delete table styles"
ON public.table_styles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_table_styles_updated_at
BEFORE UPDATE ON public.table_styles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();