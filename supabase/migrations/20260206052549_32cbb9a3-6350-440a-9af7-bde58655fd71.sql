-- Create videos table for tutorial videos
CREATE TABLE public.videos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    youtube_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration TEXT,
    category TEXT DEFAULT 'General',
    display_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Public can view published videos
CREATE POLICY "Anyone can view published videos"
ON public.videos
FOR SELECT
USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage videos"
ON public.videos
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_videos_updated_at
BEFORE UPDATE ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample videos
INSERT INTO public.videos (title, description, youtube_url, category, duration, display_order) VALUES
('Getting Started with Option Chain', 'Learn how to read and analyze option chain data effectively', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Basics', '12:34', 1),
('Understanding PCR Ratio', 'Deep dive into Put-Call Ratio analysis', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Analysis', '15:20', 2),
('Max Pain Strategy Explained', 'How to use Max Pain for trading decisions', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Strategies', '18:45', 3);