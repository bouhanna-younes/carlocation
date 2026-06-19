-- =====================================================
-- MIGRATION 013: Car images catalog
-- =====================================================
-- Stores multiple images per car (gallery/catalog).
-- Images are uploaded to Supabase Storage bucket 'car-images'.
-- This table stores the public URL + metadata.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.car_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_car_images_car_id ON public.car_images(car_id);
CREATE INDEX IF NOT EXISTS idx_car_images_sort ON public.car_images(car_id, sort_order);

-- RLS
ALTER TABLE public.car_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Car images: read all" ON public.car_images;
CREATE POLICY "Car images: read all" ON public.car_images
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Car images: insert manager" ON public.car_images;
CREATE POLICY "Car images: insert manager" ON public.car_images
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

DROP POLICY IF EXISTS "Car images: update manager" ON public.car_images;
CREATE POLICY "Car images: update manager" ON public.car_images
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

DROP POLICY IF EXISTS "Car images: delete manager" ON public.car_images;
CREATE POLICY "Car images: delete manager" ON public.car_images
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- Add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'car_images'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.car_images;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add car_images to realtime: %', SQLERRM;
END;
$$;

-- =====================================================
-- Storage bucket: car-images (public read)
-- =====================================================
-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-images', 'car-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated can read, managers can upload
DROP POLICY IF EXISTS "car-images: read all" ON storage.objects;
CREATE POLICY "car-images: read all" ON storage.objects
  FOR SELECT USING (bucket_id = 'car-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "car-images: upload manager" ON storage.objects;
CREATE POLICY "car-images: upload manager" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'car-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

DROP POLICY IF EXISTS "car-images: delete manager" ON storage.objects;
CREATE POLICY "car-images: delete manager" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'car-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- =====================================================
-- END OF MIGRATION 013
-- =====================================================
