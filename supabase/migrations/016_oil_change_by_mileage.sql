-- =====================================================
-- MIGRATION 016: Oil-change notifications by MILEAGE (not by date)
-- =====================================================
-- The oil-change reminder was previously tied to cars.oil_change_expiry
-- (a DATE). This is incorrect: oil should be changed every N km
-- (default 10 000 km), regardless of how much time passed.
--
-- This migration:
--   1. Adds mileage tracking columns on cars
--      - current_mileage  : the car's odometer (updated on rental return)
--      - last_oil_change_km : odometer reading at the last oil change
--   2. Backfills current_mileage from the latest rental end_mileage
--   3. Adds the mileage-based notification function (replaces the
--      date-based oil block inside check_and_create_expiry_notifications)
--   4. Adds a trigger so completing an oil_change maintenance record
--      automatically updates last_oil_change_km
--   5. Schedules the new function via pg_cron
--   6. Updates return_rental() to push current_mileage forward on return
-- =====================================================

-- =====================================================
-- SECTION 1: Mileage columns on cars
-- =====================================================

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS current_mileage INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS last_oil_change_km INTEGER;

-- Constraints: non-negative odometer / last-oil readings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cars_current_mileage_nonneg'
  ) THEN
    ALTER TABLE public.cars ADD CONSTRAINT cars_current_mileage_nonneg CHECK (current_mileage >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cars_last_oil_change_nonneg'
  ) THEN
    ALTER TABLE public.cars ADD CONSTRAINT cars_last_oil_change_nonneg
      CHECK (last_oil_change_km IS NULL OR last_oil_change_km >= 0);
  END IF;
END $$;

-- last_oil_change_km cannot be greater than the current odometer
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cars_oil_change_within_mileage'
  ) THEN
    ALTER TABLE public.cars ADD CONSTRAINT cars_oil_change_within_mileage
      CHECK (last_oil_change_km IS NULL OR last_oil_change_km <= current_mileage);
  END IF;
END $$;

-- Index for the notification scan
CREATE INDEX IF NOT EXISTS idx_cars_current_mileage ON public.cars(current_mileage);

-- =====================================================
-- SECTION 2: Backfill current_mileage from rentals
-- Use the latest known end_mileage per car; 0 if none.
-- =====================================================
UPDATE public.cars c
SET current_mileage = COALESCE(
  (SELECT MAX(r.end_mileage)
   FROM public.rentals r
   WHERE r.car_id = c.id AND r.end_mileage IS NOT NULL),
  current_mileage
);

-- =====================================================
-- SECTION 3: Mileage-based oil-change notification function
-- Two notification levels:
--   - "due_soon" (warning) when km_since >= interval - 500  (default 9500)
--   - "overdue"  (error)   when km_since >= interval        (default 10000)
-- The interval is read from settings.rental-policy->'oilChangeIntervalKm'
-- (default 10000). Skips cars with no last_oil_change_km recorded yet.
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_oil_change_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_interval INTEGER := 10000;
  v_threshold INTEGER := 9500;
  v_settings_val JSONB;
  v_created INTEGER := 0;
  r RECORD;
  v_km_since INTEGER;
  v_exists UUID;
BEGIN
  -- Read the oil-change interval from settings (fallback to 10000)
  BEGIN
    SELECT value::jsonb INTO v_settings_val
    FROM public.settings WHERE key = 'rental-policy';
    IF v_settings_val IS NOT NULL AND v_settings_val ? 'oilChangeIntervalKm' THEN
      v_interval := (v_settings_val->>'oilChangeIntervalKm')::INTEGER;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_interval := 10000;
  END;

  -- Early-warning threshold = interval - 500 (clamp to 0)
  v_threshold := GREATEST(v_interval - 500, 0);

  FOR r IN
    SELECT id, brand, model, current_mileage, last_oil_change_km
    FROM public.cars
    WHERE status <> 'out_of_service'
  LOOP
    -- Cannot compute km-since-last-change if no baseline recorded
    IF r.last_oil_change_km IS NULL THEN
      CONTINUE;
    END IF;

    v_km_since := r.current_mileage - r.last_oil_change_km;

    -- OVERDUE: km_since >= interval (e.g. >= 10000)
    IF v_km_since >= v_interval THEN
      SELECT id INTO v_exists
      FROM public.notifications
      WHERE category = 'oil_change'
        AND metadata->>'carId' = r.id::TEXT
        AND metadata->>'level' = 'overdue'
        AND is_read = false
      LIMIT 1;

      IF v_exists IS NULL THEN
        INSERT INTO public.notifications (title, message, type, category, metadata)
        VALUES (
          'تجاوز موعد تغيير الزيت',
          r.brand || ' ' || r.model || ' — قطعت ' || v_km_since || ' كم منذ آخر تغيير زيت (الفترة المحددة ' || v_interval || ' كم)',
          'error',
          'oil_change',
          jsonb_build_object('carId', r.id::TEXT, 'kmSince', v_km_since, 'interval', v_interval, 'level', 'overdue')
        );
        v_created := v_created + 1;
      END IF;

    -- DUE SOON: threshold (e.g. 9500) <= km_since < interval
    ELSIF v_km_since >= v_threshold THEN
      SELECT id INTO v_exists
      FROM public.notifications
      WHERE category = 'oil_change'
        AND metadata->>'carId' = r.id::TEXT
        AND metadata->>'level' = 'due_soon'
        AND is_read = false
      LIMIT 1;

      IF v_exists IS NULL THEN
        INSERT INTO public.notifications (title, message, type, category, metadata)
        VALUES (
          'اقتراب موعد تغيير الزيت',
          r.brand || ' ' || r.model || ' — قطعت ' || v_km_since || ' كم من أصل ' || v_interval || ' كم المطلوبة لتغيير الزيت',
          'warning',
          'oil_change',
          jsonb_build_object('carId', r.id::TEXT, 'kmSince', v_km_since, 'interval', v_interval, 'level', 'due_soon')
        );
        v_created := v_created + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_oil_change_notifications() TO authenticated;

-- =====================================================
-- SECTION 4: Trigger — auto-update last_oil_change_km
-- When an oil_change maintenance record is marked completed,
-- record the odometer at completion (or current_mileage as fallback).
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_oil_change_km()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_mileage INTEGER;
BEGIN
  -- Only act on completion of an oil_change maintenance record
  IF TG_OP = 'UPDATE'
     AND NEW.type = 'oil_change'
     AND NEW.status = 'completed'
     AND OLD.status <> 'completed' THEN

    SELECT current_mileage INTO v_current_mileage
    FROM public.cars WHERE id = NEW.car_id;

    -- Prefer the recorded mileage_at_completion; otherwise use current odometer
    UPDATE public.cars
    SET last_oil_change_km = COALESCE(NEW.mileage_at_completion, v_current_mileage)
    WHERE id = NEW.car_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_oil_change_km ON public.maintenance;
CREATE TRIGGER trg_sync_oil_change_km
  AFTER UPDATE ON public.maintenance
  FOR EACH ROW EXECUTE FUNCTION public.sync_oil_change_km();

-- =====================================================
-- SECTION 5: Schedule the new check via pg_cron (best-effort)
-- =====================================================
DO $body$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'check-oil-change-notifications',
      '0 8 * * *',
      $cron$SELECT public.check_oil_change_notifications();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available; schedule manually via Supabase Dashboard';
END;
$body$;

-- =====================================================
-- SECTION 6: Push current_mileage forward on rental return
-- Redefine return_rental() so the car's odometer is updated with
-- the end_mileage reported at return.
-- =====================================================
CREATE OR REPLACE FUNCTION public.return_rental(
  p_rental_id UUID,
  p_end_mileage INTEGER DEFAULT NULL,
  p_fuel_level_end TEXT DEFAULT NULL,
  p_is_washed_end BOOLEAN DEFAULT FALSE,
  p_scratches_end JSONB DEFAULT NULL,
  p_additional_payment NUMERIC(12,2) DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $body$
DECLARE
  v_rental RECORD;
  v_used_days NUMERIC(10,2);
  v_final_amount NUMERIC(12,2);
  v_effective_rate NUMERIC(12,2);
  v_total_paid NUMERIC(12,2);
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_rental FROM public.rentals WHERE id = p_rental_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكراء غير موجود');
  END IF;

  IF v_rental.status NOT IN ('active', 'overdue') THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن إرجاع كراء غير نشط');
  END IF;

  v_used_days := CEIL(EXTRACT(EPOCH FROM (v_now - v_rental.start_date)) / 86400.0);
  IF v_used_days < 1 THEN v_used_days := 1; END IF;

  v_effective_rate := v_rental.daily_rate;
  IF v_rental.discount_percent IS NOT NULL AND v_rental.discount_percent > 0 THEN
    v_effective_rate := v_rental.daily_rate * (1 - v_rental.discount_percent / 100.0);
  END IF;

  v_final_amount := v_used_days * v_effective_rate;
  v_total_paid := COALESCE(v_rental.amount_paid, 0) + COALESCE(p_additional_payment, 0);

  -- 1. Update rental with all condition fields
  UPDATE public.rentals
  SET status = 'completed',
      return_date = v_now,
      total_amount = v_final_amount,
      end_mileage = p_end_mileage,
      fuel_level_end = p_fuel_level_end,
      is_washed_end = p_is_washed_end,
      scratches_end = COALESCE(p_scratches_end, '[]'::jsonb),
      amount_paid = v_total_paid
  WHERE id = p_rental_id;

  -- 2. Update invoice — mark as paid
  UPDATE public.invoices
  SET return_date = v_now,
      total_days = v_used_days,
      total_amount = v_final_amount,
      status = 'paid',
      paid_amount = v_final_amount
  WHERE rental_id = p_rental_id;

  -- 3. Update car status AND push the odometer forward
  UPDATE public.cars
  SET status = 'available',
      current_mileage = COALESCE(p_end_mileage, cars.current_mileage)
  WHERE id = v_rental.car_id;

  RETURN jsonb_build_object(
    'success', true,
    'finalAmount', v_final_amount,
    'usedDays', v_used_days,
    'totalPaid', v_total_paid,
    'remaining', GREATEST(v_final_amount - v_total_paid, 0)
  );
END;
$body$;

GRANT EXECUTE ON FUNCTION public.return_rental(UUID, INTEGER, TEXT, BOOLEAN, JSONB, NUMERIC) TO authenticated;

-- =====================================================
-- SECTION 7: Remove the date-based oil block from the
-- expiry-notification function.
-- Oil change is now mileage-based (see Section 3), so the date-based
-- branch that reads cars.oil_change_expiry is dropped here.
-- insurance / vignette / inspection / license_expiry are unchanged.
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_and_create_expiry_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_created INTEGER := 0;
  v_in15days DATE := (now() + INTERVAL '15 days')::DATE;
  v_in30days DATE := (now() + INTERVAL '30 days')::DATE;
  r RECORD;
  v_exists UUID;
  v_title TEXT;
  v_msg TEXT;
BEGIN
  -- ---- CARS: insurance, vignette, inspection (15-day window) ----
  -- NOTE: oil change is no longer date-based; it is handled by
  -- check_oil_change_notifications() using mileage.
  FOR r IN
    SELECT id, brand, model,
           insurance_expiry, vignette_expiry, inspection_expiry
    FROM public.cars
    WHERE status <> 'out_of_service'
  LOOP
    -- insurance
    IF r.insurance_expiry IS NOT NULL AND r.insurance_expiry <= v_in15days AND r.insurance_expiry > now()::DATE THEN
      SELECT id INTO v_exists FROM public.notifications
      WHERE category = 'insurance' AND metadata->>'carId' = r.id::TEXT
        AND title LIKE 'تأمين%' AND is_read = false LIMIT 1;
      IF v_exists IS NULL THEN
        v_title := 'تأمين السيارة ينتهي قريباً';
        v_msg := r.brand || ' ' || r.model || ' - تاريخ انتهاء التأمين: ' || r.insurance_expiry::TEXT;
        INSERT INTO public.notifications (title, message, type, category, metadata)
        VALUES (v_title, v_msg, 'warning', 'insurance', jsonb_build_object('carId', r.id::TEXT, 'expiryDate', r.insurance_expiry::TEXT));
        v_created := v_created + 1;
      END IF;
    END IF;

    -- vignette
    IF r.vignette_expiry IS NOT NULL AND r.vignette_expiry <= v_in15days AND r.vignette_expiry > now()::DATE THEN
      SELECT id INTO v_exists FROM public.notifications
      WHERE category = 'vignette' AND metadata->>'carId' = r.id::TEXT AND is_read = false LIMIT 1;
      IF v_exists IS NULL THEN
        v_title := 'الفيغنيت ينتهي قريباً';
        v_msg := r.brand || ' ' || r.model || ' - تاريخ انتهاء الفيغنيت: ' || r.vignette_expiry::TEXT;
        INSERT INTO public.notifications (title, message, type, category, metadata)
        VALUES (v_title, v_msg, 'warning', 'vignette', jsonb_build_object('carId', r.id::TEXT, 'expiryDate', r.vignette_expiry::TEXT));
        v_created := v_created + 1;
      END IF;
    END IF;

    -- inspection
    IF r.inspection_expiry IS NOT NULL AND r.inspection_expiry <= v_in15days AND r.inspection_expiry > now()::DATE THEN
      SELECT id INTO v_exists FROM public.notifications
      WHERE category = 'inspection' AND metadata->>'carId' = r.id::TEXT AND is_read = false LIMIT 1;
      IF v_exists IS NULL THEN
        v_title := 'المعاينة التقنية تنتهي قريباً';
        v_msg := r.brand || ' ' || r.model || ' - تاريخ انتهاء المعاينة: ' || r.inspection_expiry::TEXT;
        INSERT INTO public.notifications (title, message, type, category, metadata)
        VALUES (v_title, v_msg, 'warning', 'inspection', jsonb_build_object('carId', r.id::TEXT, 'expiryDate', r.inspection_expiry::TEXT));
        v_created := v_created + 1;
      END IF;
    END IF;
  END LOOP;

  -- ---- CUSTOMERS: license expiry (30-day window) ----
  FOR r IN
    SELECT id, first_name, last_name, driver_license_expiry
    FROM public.customers
    WHERE blacklisted = false
  LOOP
    IF r.driver_license_expiry IS NOT NULL AND r.driver_license_expiry <= v_in30days AND r.driver_license_expiry > now()::DATE THEN
      SELECT id INTO v_exists FROM public.notifications
      WHERE category = 'license_expiry' AND metadata->>'customerId' = r.id::TEXT AND is_read = false LIMIT 1;
      IF v_exists IS NULL THEN
        v_title := 'رخصة القيادة تنتهي قريباً';
        v_msg := r.first_name || ' ' || r.last_name || ' - تاريخ انتهاء الرخصة: ' || r.driver_license_expiry::TEXT;
        INSERT INTO public.notifications (title, message, type, category, metadata)
        VALUES (v_title, v_msg, 'warning', 'license_expiry', jsonb_build_object('customerId', r.id::TEXT, 'expiryDate', r.driver_license_expiry::TEXT));
        v_created := v_created + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_created;
END;
$$;

-- =====================================================
-- END OF MIGRATION 016
-- =====================================================
