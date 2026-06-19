-- =====================================================
-- MIGRATION 012: Rental condition tracking fields
-- =====================================================
-- Tracks car condition at rental start and return:
--   - Payment: amount_paid (upfront payment at creation)
--   - Fuel level: full / half / quarter / low
--   - Wash status: boolean
--   - Scratches: JSONB array of {location, description}
-- =====================================================

ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS fuel_level_start TEXT
  CHECK (fuel_level_start IS NULL OR fuel_level_start IN ('full', 'half', 'quarter', 'low'));
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS fuel_level_end TEXT
  CHECK (fuel_level_end IS NULL OR fuel_level_end IN ('full', 'half', 'quarter', 'low'));
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS is_washed_start BOOLEAN DEFAULT false;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS is_washed_end BOOLEAN DEFAULT false;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS scratches_start JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS scratches_end JSONB DEFAULT '[]'::jsonb;

-- Add CHECK: amount_paid cannot be negative
ALTER TABLE public.rentals ADD CONSTRAINT rentals_amount_paid_nonneg
  CHECK (amount_paid >= 0);

-- =====================================================
-- END OF MIGRATION 012
-- =====================================================
