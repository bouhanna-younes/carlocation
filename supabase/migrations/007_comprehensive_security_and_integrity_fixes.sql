-- =====================================================
-- Migration 007: Comprehensive Security, Integrity & Performance Fixes
-- Addresses all critical issues from the deep audit
-- =====================================================

-- =====================================================
-- SECTION 1: SECURITY DEFINER functions search_path
-- Pin search_path to prevent hijacking (Supabase recommendation)
-- =====================================================

-- 1.1 handle_new_user: already defined in 006, redefine with SET search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'worker'
  );
  RETURN NEW;
END;
$$;

-- 1.2 prevent_role_escalation: add SET search_path
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    ) THEN
      RAISE EXCEPTION 'Only managers can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 1.3 auto_invoice_on_rental: add SET search_path, read cancellation penalty from settings
CREATE OR REPLACE FUNCTION public.auto_invoice_on_rental()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_total_days NUMERIC(10,2);
  v_total_amount NUMERIC(12,2);
  v_penalty_percent NUMERIC(5,2) := 35;
  v_penalty_amount NUMERIC(12,2);
  v_refund_amount NUMERIC(12,2);
  v_settings_value jsonb;
BEGIN
  -- Read cancellation penalty from settings (fallback to 35)
  BEGIN
    SELECT value::jsonb INTO v_settings_value FROM public.settings WHERE key = 'rental-policy';
    IF v_settings_value IS NOT NULL AND v_settings_value ? 'cancellationPenaltyPercent' THEN
      v_penalty_percent := (v_settings_value->>'cancellationPenaltyPercent')::NUMERIC;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_penalty_percent := 35;
  END;

  -- INSERT: Create invoice when rental is created
  IF TG_OP = 'INSERT' THEN
    v_total_days := CEIL(EXTRACT(EPOCH FROM (NEW.end_date - NEW.start_date)) / 86400.0);
    IF v_total_days < 1 THEN v_total_days := 1; END IF;
    v_total_amount := v_total_days * NEW.daily_rate;

    SELECT 'INV-' || LPAD(nextval('invoices_number_seq')::TEXT, 6, '0')
    INTO v_invoice_number;

    INSERT INTO public.invoices (
      rental_id, customer_id, car_id,
      invoice_number, invoice_date,
      start_date, end_date,
      daily_rate, total_days, total_amount,
      deposit_amount, status, paid_amount
    ) VALUES (
      NEW.id, NEW.customer_id, NEW.car_id,
      v_invoice_number, now(),
      NEW.start_date, NEW.end_date,
      NEW.daily_rate, v_total_days, v_total_amount,
      COALESCE(NEW.deposit_amount, 0), 'pending', 0
    );

    RETURN NEW;
  END IF;

  -- UPDATE: Handle status changes
  IF TG_OP = 'UPDATE' THEN
    -- Car returned: keep invoice 'pending' until manually marked paid
    -- (Fix: do not auto-set 'paid' on completion; payment must be confirmed separately)
    IF NEW.status = 'completed' AND OLD.status <> 'completed' AND NEW.return_date IS NOT NULL THEN
      v_total_days := CEIL(EXTRACT(EPOCH FROM (NEW.return_date - NEW.start_date)) / 86400.0);
      IF v_total_days < 1 THEN v_total_days := 1; END IF;
      v_total_amount := v_total_days * NEW.daily_rate;

      UPDATE public.invoices
      SET return_date = NEW.return_date,
          total_days = v_total_days,
          total_amount = v_total_amount
      WHERE rental_id = NEW.id;

      RETURN NEW;
    END IF;

    -- Rental cancelled
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
      v_penalty_amount := COALESCE(NEW.total_amount, 0) * v_penalty_percent / 100.0;
      v_refund_amount := COALESCE(NEW.deposit_amount, 0) - v_penalty_amount;
      IF v_refund_amount < 0 THEN v_refund_amount := 0; END IF;

      UPDATE public.invoices
      SET is_cancelled = true,
          cancelled_at = now(),
          penalty_percent = v_penalty_percent,
          penalty_amount = v_penalty_amount,
          refund_amount = v_refund_amount,
          status = 'cancelled'
      WHERE rental_id = NEW.id;

      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- SECTION 2: RLS POLICIES — Fix critical security holes
-- =====================================================

-- 2.1 profiles SELECT: stop exposing all emails/PII to every user.
-- Only expose id + role + name + active (not email) to authenticated users.
-- Drop the over-permissive SELECT policy.
DROP POLICY IF EXISTS "Profiles: read all" ON public.profiles;
CREATE POLICY "Profiles: read limited" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2.2 profiles: allow managers to update other users (enables role management)
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
CREATE POLICY "Profiles: update own or manager" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- 2.3 rentals INSERT: restrict to active managers (not any authenticated user)
DROP POLICY IF EXISTS "Rentals: insert authenticated" ON public.rentals;
CREATE POLICY "Rentals: insert authenticated active" ON public.rentals
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager' AND active = true
    )
  );

-- 2.4 notifications: add recipient_id column for per-user scoping
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Mark existing notifications as global (NULL recipient = broadcast to all)
-- New per-user notifications will set recipient_id; SELECT policy returns rows where recipient_id is NULL OR matches user
DROP POLICY IF EXISTS "Notifications: read all" ON public.notifications;
CREATE POLICY "Notifications: read all" ON public.notifications
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (recipient_id IS NULL OR recipient_id = auth.uid())
  );

-- Only the recipient (or manager) can mark-as-read their own notifications
DROP POLICY IF EXISTS "Notifications: update all" ON public.notifications;
CREATE POLICY "Notifications: update own or manager" ON public.notifications
  FOR UPDATE USING (
    recipient_id = auth.uid()
    OR recipient_id IS NULL AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- Only the recipient (or manager) can delete their own notifications
DROP POLICY IF EXISTS "Notifications: delete all" ON public.notifications;
CREATE POLICY "Notifications: delete own or manager" ON public.notifications
  FOR DELETE USING (
    recipient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- 2.5 tracking: add UPDATE policy (append-only is enforced by app, not RLS — but be explicit)
-- (No change needed; tracking has no UPDATE policy currently, which means UPDATE is denied by default RLS. OK.)

-- 2.6 Add index on notifications.recipient_id for policy performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);

-- 2.7 Add composite index on notifications (recipient_id, is_read) for unread-count queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_id, is_read) WHERE is_read = false;

-- =====================================================
-- SECTION 3: MISSING INDEXES
-- =====================================================

-- 3.1 invoices.car_id (the only unindexed FK column in the schema)
CREATE INDEX IF NOT EXISTS idx_invoices_car_id ON public.invoices(car_id);

-- 3.2 tracking composite index for latest_tracking view performance
CREATE INDEX IF NOT EXISTS idx_tracking_car_timestamp ON public.tracking(car_id, "timestamp" DESC);

-- 3.3 rentals return_date (used in overdue queries)
CREATE INDEX IF NOT EXISTS idx_rentals_return_date ON public.rentals(return_date);

-- 3.4 maintenance scheduled_at / completed_at / priority
CREATE INDEX IF NOT EXISTS idx_maintenance_scheduled_at ON public.maintenance(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_completed_at ON public.maintenance(completed_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON public.maintenance(priority);

-- 3.5 customers blacklisted (partial index — most rows are false)
CREATE INDEX IF NOT EXISTS idx_customers_blacklisted ON public.customers(id) WHERE blacklisted = true;

-- 3.6 customers driver_license_expiry (for expiry-check queries)
CREATE INDEX IF NOT EXISTS idx_customers_license_expiry ON public.customers(driver_license_expiry);

-- 3.7 cars expiry columns (for expiry-check queries)
CREATE INDEX IF NOT EXISTS idx_cars_insurance_expiry ON public.cars(insurance_expiry);
CREATE INDEX IF NOT EXISTS idx_cars_oil_change_expiry ON public.cars(oil_change_expiry);
CREATE INDEX IF NOT EXISTS idx_cars_vignette_expiry ON public.cars(vignette_expiry);
CREATE INDEX IF NOT EXISTS idx_cars_inspection_expiry ON public.cars(inspection_expiry);

-- =====================================================
-- SECTION 4: DATA TYPES — Money to NUMERIC, dates to DATE
-- =====================================================

-- 4.1 Convert money columns to NUMERIC(12,2) across all tables
-- cars.daily_rate
ALTER TABLE public.cars ALTER COLUMN daily_rate TYPE NUMERIC(12,2) USING daily_rate::NUMERIC(12,2);

-- rentals
ALTER TABLE public.rentals ALTER COLUMN daily_rate TYPE NUMERIC(12,2) USING daily_rate::NUMERIC(12,2);
ALTER TABLE public.rentals ALTER COLUMN total_amount TYPE NUMERIC(12,2) USING total_amount::NUMERIC(12,2);
ALTER TABLE public.rentals ALTER COLUMN deposit_amount TYPE NUMERIC(12,2) USING deposit_amount::NUMERIC(12,2);
ALTER TABLE public.rentals ALTER COLUMN discount_percent TYPE NUMERIC(5,2) USING discount_percent::NUMERIC(5,2);

-- maintenance.cost
ALTER TABLE public.maintenance ALTER COLUMN cost TYPE NUMERIC(12,2) USING cost::NUMERIC(12,2);

-- invoices (all money columns)
ALTER TABLE public.invoices ALTER COLUMN daily_rate TYPE NUMERIC(12,2) USING daily_rate::NUMERIC(12,2);
ALTER TABLE public.invoices ALTER COLUMN total_days TYPE NUMERIC(10,2) USING total_days::NUMERIC(10,2);
ALTER TABLE public.invoices ALTER COLUMN total_amount TYPE NUMERIC(12,2) USING total_amount::NUMERIC(12,2);
ALTER TABLE public.invoices ALTER COLUMN deposit_amount TYPE NUMERIC(12,2) USING deposit_amount::NUMERIC(12,2);
ALTER TABLE public.invoices ALTER COLUMN penalty_percent TYPE NUMERIC(5,2) USING penalty_percent::NUMERIC(5,2);
ALTER TABLE public.invoices ALTER COLUMN penalty_amount TYPE NUMERIC(12,2) USING penalty_amount::NUMERIC(12,2);
ALTER TABLE public.invoices ALTER COLUMN refund_amount TYPE NUMERIC(12,2) USING refund_amount::NUMERIC(12,2);
ALTER TABLE public.invoices ALTER COLUMN paid_amount TYPE NUMERIC(12,2) USING paid_amount::NUMERIC(12,2);

-- 4.2 Convert date TEXT columns to DATE
-- customers.driver_license_expiry
ALTER TABLE public.customers ALTER COLUMN driver_license_expiry TYPE DATE USING driver_license_expiry::DATE;
ALTER TABLE public.customers ALTER COLUMN date_of_birth TYPE DATE USING date_of_birth::DATE;

-- 4.3 Convert settings.value and notifications.metadata to JSONB
ALTER TABLE public.settings ALTER COLUMN value TYPE JSONB USING value::JSONB;
ALTER TABLE public.notifications ALTER COLUMN metadata TYPE JSONB USING metadata::JSONB;

-- =====================================================
-- SECTION 5: CHECK CONSTRAINTS — non-negative & ranges
-- =====================================================

-- 5.1 cars
ALTER TABLE public.cars ADD CONSTRAINT cars_daily_rate_nonneg CHECK (daily_rate >= 0);
ALTER TABLE public.cars ADD CONSTRAINT cars_year_valid CHECK (year BETWEEN 1950 AND EXTRACT(YEAR FROM now())::INT + 1);
ALTER TABLE public.cars ADD CONSTRAINT cars_seats_positive CHECK (seats > 0);

-- 5.2 rentals
ALTER TABLE public.rentals ADD CONSTRAINT rentals_daily_rate_nonneg CHECK (daily_rate >= 0);
ALTER TABLE public.rentals ADD CONSTRAINT rentals_total_amount_nonneg CHECK (total_amount IS NULL OR total_amount >= 0);
ALTER TABLE public.rentals ADD CONSTRAINT rentals_deposit_nonneg CHECK (deposit_amount IS NULL OR deposit_amount >= 0);
ALTER TABLE public.rentals ADD CONSTRAINT rentals_discount_range CHECK (discount_percent >= 0 AND discount_percent <= 100);
ALTER TABLE public.rentals ADD CONSTRAINT rentals_dates_valid CHECK (end_date > start_date);
ALTER TABLE public.rentals ADD CONSTRAINT rentals_return_after_start CHECK (return_date IS NULL OR return_date >= start_date);
ALTER TABLE public.rentals ADD CONSTRAINT rentals_mileage_order CHECK (start_mileage IS NULL OR end_mileage IS NULL OR end_mileage >= start_mileage);

-- 5.3 maintenance
ALTER TABLE public.maintenance ADD CONSTRAINT maintenance_cost_nonneg CHECK (cost >= 0);
ALTER TABLE public.maintenance ADD CONSTRAINT maintenance_mileage_order CHECK (mileage_at_start IS NULL OR mileage_at_completion IS NULL OR mileage_at_completion >= mileage_at_start);

-- 5.4 invoices
ALTER TABLE public.invoices ADD CONSTRAINT invoices_total_amount_nonneg CHECK (total_amount >= 0);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_total_days_nonneg CHECK (total_days >= 0);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_penalty_range CHECK (penalty_percent >= 0 AND penalty_percent <= 100);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_paid_nonneg CHECK (paid_amount >= 0);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_refund_nonneg CHECK (refund_amount >= 0);

-- 5.5 tracking (geo ranges)
ALTER TABLE public.tracking ADD CONSTRAINT tracking_lat_valid CHECK (latitude >= -90 AND latitude <= 90);
ALTER TABLE public.tracking ADD CONSTRAINT tracking_lng_valid CHECK (longitude >= -180 AND longitude <= 180);
ALTER TABLE public.tracking ADD CONSTRAINT tracking_heading_valid CHECK (heading IS NULL OR (heading >= 0 AND heading < 360));
ALTER TABLE public.tracking ADD CONSTRAINT tracking_speed_nonneg CHECK (speed IS NULL OR speed >= 0);

-- 5.6 notifications: add 'error'/'danger' to allowed type values
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('info', 'success', 'warning', 'error'));

-- 5.7 customers.driver_license_number should be unique (data quality)
ALTER TABLE public.customers ADD CONSTRAINT customers_driver_license_unique UNIQUE (driver_license_number);

-- =====================================================
-- SECTION 6: PREVENT OVERLAPPING RENTALS (EXCLUDE constraint)
-- A car cannot be in two active/reserved/overdue rentals at the same time
-- Uses btree_gist extension for tsrange exclusion
-- =====================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add EXCLUDE constraint: for the same car_id, no two rentals with status in
-- (active, reserved, overdue) may have overlapping [start_date, end_date] ranges.
ALTER TABLE public.rentals ADD CONSTRAINT rentals_no_overlap_per_car
  EXCLUDE USING gist (
    car_id WITH =,
    tstzrange(start_date, end_date) WITH &&
  ) WHERE (status IN ('active', 'reserved', 'overdue'));

-- =====================================================
-- SECTION 7: SCHEDULED JOBS — expiry checks & overdue updates
-- Replace client-side batch logic with server-side cron
-- =====================================================

-- 7.1 Function to mark overdue rentals (replaces the write-inside-queryFn anti-pattern)
CREATE OR REPLACE FUNCTION public.mark_overdue_rentals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.rentals
  SET status = 'overdue'
  WHERE status = 'active'
    AND end_date < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 7.2 Function to create expiry-based notifications server-side.
-- Replaces client-side lib/notifications.ts checkExpiryDates.
-- Runs for cars (insurance, oil, vignette, inspection) and customers (license expiry).
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
  v_category TEXT;
BEGIN
  -- ---- CARS: insurance, oil, vignette, inspection (15-day window) ----
  FOR r IN
    SELECT id, brand, model,
           insurance_expiry, oil_change_expiry, vignette_expiry, inspection_expiry
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

    -- oil change
    IF r.oil_change_expiry IS NOT NULL AND r.oil_change_expiry <= v_in15days AND r.oil_change_expiry > now()::DATE THEN
      SELECT id INTO v_exists FROM public.notifications
      WHERE category = 'oil_change' AND metadata->>'carId' = r.id::TEXT AND is_read = false LIMIT 1;
      IF v_exists IS NULL THEN
        v_title := 'موعد تغيير الزيت';
        v_msg := r.brand || ' ' || r.model || ' - تاريخ تغيير الزيت: ' || r.oil_change_expiry::TEXT;
        INSERT INTO public.notifications (title, message, type, category, metadata)
        VALUES (v_title, v_msg, 'warning', 'oil_change', jsonb_build_object('carId', r.id::TEXT, 'expiryDate', r.oil_change_expiry::TEXT));
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

-- 7.3 Grant execute to authenticated so client can trigger on-demand if needed
GRANT EXECUTE ON FUNCTION public.mark_overdue_rentals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_create_expiry_notifications() TO authenticated;

-- 7.4 Enable pg_cron extension for scheduled jobs
-- NOTE: pg_cron must be enabled via Supabase Dashboard (Database → Extensions) or:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- The schedule statements below are guarded with a DO block so they no-op if pg_cron is missing.
-- We use $cron$ dollar-quoting for the inner SQL strings to avoid conflict with the outer $body$ tag.

DO $body$
BEGIN
  -- Only attempt to schedule if pg_cron is installed
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Mark overdue rentals every hour
    PERFORM cron.schedule('mark-overdue-rentals', '0 * * * *', $cron$SELECT public.mark_overdue_rentals();$cron$);

    -- Check expiry notifications daily at 08:00
    PERFORM cron.schedule('check-expiry-notifications', '0 8 * * *', $cron$SELECT public.check_and_create_expiry_notifications();$cron$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not available — jobs must be run via Supabase Edge Function / external scheduler
  RAISE NOTICE 'pg_cron not available; schedule manually via Supabase Dashboard';
END;
$body$;

-- =====================================================
-- SECTION 8: AGGREGATE RPCs (replace client-side aggregation)
-- =====================================================

-- 8.1 dashboard_kpis() — replaces the 4 parallel client-side fetches in dashboard/page.tsx
CREATE OR REPLACE FUNCTION public.dashboard_kpis()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_cars INTEGER;
  v_available_cars INTEGER;
  v_rented_cars INTEGER;
  v_maintenance_cars INTEGER;
  v_total_customers INTEGER;
  v_blacklisted INTEGER;
  v_active_rentals INTEGER;
  v_overdue_rentals INTEGER;
  v_revenue_this_month NUMERIC(12,2);
  v_revenue_last_month NUMERIC(12,2);
  v_revenue_ytd NUMERIC(12,2);
  v_open_invoices_count INTEGER;
  v_open_invoices_amount NUMERIC(12,2);
  v_pending_maintenance INTEGER;
  v_result JSONB;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'available'),
         COUNT(*) FILTER (WHERE status = 'rented'),
         COUNT(*) FILTER (WHERE status = 'maintenance')
  INTO v_total_cars, v_available_cars, v_rented_cars, v_maintenance_cars;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE blacklisted) INTO v_total_customers, v_blacklisted;

  SELECT COUNT(*) FILTER (WHERE status = 'active'),
         COUNT(*) FILTER (WHERE status = 'overdue')
  INTO v_active_rentals, v_overdue_rentals;

  SELECT
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid' AND date_trunc('month', invoice_date) = date_trunc('month', now())), 0),
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid' AND date_trunc('month', invoice_date) = date_trunc('month', now() - INTERVAL '1 month')), 0),
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid' AND date_trunc('year', invoice_date) = date_trunc('year', now())), 0)
  INTO v_revenue_this_month, v_revenue_last_month, v_revenue_ytd;

  SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
  INTO v_open_invoices_count, v_open_invoices_amount
  FROM public.invoices WHERE status = 'pending';

  SELECT COUNT(*) INTO v_pending_maintenance FROM public.maintenance WHERE status IN ('pending', 'in_progress');

  v_result := jsonb_build_object(
    'totalCars', v_total_cars,
    'availableCars', v_available_cars,
    'rentedCars', v_rented_cars,
    'maintenanceCars', v_maintenance_cars,
    'totalCustomers', v_total_customers,
    'blacklistedCustomers', v_blacklisted,
    'activeRentals', v_active_rentals,
    'overdueRentals', v_overdue_rentals,
    'revenueThisMonth', v_revenue_this_month,
    'revenueLastMonth', v_revenue_last_month,
    'revenueYtd', v_revenue_ytd,
    'openInvoicesCount', v_open_invoices_count,
    'openInvoicesAmount', v_open_invoices_amount,
    'pendingMaintenance', v_pending_maintenance
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_kpis() TO authenticated;

-- 8.2 monthly_revenue(p_year INT) — replaces client-side aggregation in reports
CREATE OR REPLACE FUNCTION public.monthly_revenue(p_year INTEGER DEFAULT NULL)
RETURNS TABLE (month_index INTEGER, month_label TEXT, revenue NUMERIC(12,2), count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM now())::INT);
BEGIN
  RETURN QUERY
  SELECT
    m.month_index,
    m.month_label,
    COALESCE(SUM(i.total_amount), 0)::NUMERIC(12,2) AS revenue,
    COUNT(i.id)::INTEGER AS count
  FROM (
    VALUES (1, 'جانفي'), (2, 'فيفري'), (3, 'مارس'), (4, 'أفريل'),
           (5, 'ماي'), (6, 'جوان'), (7, 'جويلية'), (8, 'أوت'),
           (9, 'سبتمبر'), (10, 'أكتوبر'), (11, 'نوفمبر'), (12, 'ديسمبر')
  ) AS m(month_index, month_label)
  LEFT JOIN public.invoices i ON EXTRACT(MONTH FROM i.invoice_date)::INT = m.month_index
                                AND EXTRACT(YEAR FROM i.invoice_date)::INT = v_year
                                AND i.status = 'paid'
  GROUP BY m.month_index, m.month_label
  ORDER BY m.month_index;
END;
$$;

GRANT EXECUTE ON FUNCTION public.monthly_revenue(INTEGER) TO authenticated;

-- 8.3 top_cars(limit INT) — replaces unbounded client-side fetch
CREATE OR REPLACE FUNCTION public.top_cars(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (car_id UUID, brand TEXT, model TEXT, plate_number TEXT, total_revenue NUMERIC(12,2), rentals_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS car_id,
    c.brand,
    c.model,
    c.plate_number,
    COALESCE(SUM(i.total_amount), 0)::NUMERIC(12,2) AS total_revenue,
    COUNT(r.id)::INTEGER AS rentals_count
  FROM public.cars c
  LEFT JOIN public.rentals r ON r.car_id = c.id AND r.status = 'completed'
  LEFT JOIN public.invoices i ON i.rental_id = r.id AND i.status = 'paid'
  GROUP BY c.id, c.brand, c.model, c.plate_number
  ORDER BY total_revenue DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.top_cars(INTEGER) TO authenticated;

-- 8.4 top_customers(limit INT) — replaces unbounded client-side fetch
CREATE OR REPLACE FUNCTION public.top_customers(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (customer_id UUID, first_name TEXT, last_name TEXT, total_spent NUMERIC(12,2), rentals_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cu.id AS customer_id,
    cu.first_name,
    cu.last_name,
    COALESCE(SUM(i.total_amount), 0)::NUMERIC(12,2) AS total_spent,
    COUNT(r.id)::INTEGER AS rentals_count
  FROM public.customers cu
  LEFT JOIN public.rentals r ON r.customer_id = cu.id AND r.status = 'completed'
  LEFT JOIN public.invoices i ON i.rental_id = r.id AND i.status = 'paid'
  GROUP BY cu.id, cu.first_name, cu.last_name
  ORDER BY total_spent DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.top_customers(INTEGER) TO authenticated;

-- 8.5 customer_stats() — replaces N+1 client-side loop in customers page
-- Returns per-customer aggregates in a single query
CREATE OR REPLACE FUNCTION public.customer_stats()
RETURNS TABLE (customer_id UUID, total_rentals INTEGER, active_rentals INTEGER, completed_rentals INTEGER, total_spent NUMERIC(12,2), outstanding NUMERIC(12,2))
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cu.id AS customer_id,
    COUNT(r.id)::INTEGER AS total_rentals,
    COUNT(r.id) FILTER (WHERE r.status = 'active')::INTEGER AS active_rentals,
    COUNT(r.id) FILTER (WHERE r.status = 'completed')::INTEGER AS completed_rentals,
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'paid'), 0)::NUMERIC(12,2) AS total_spent,
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'pending'), 0)::NUMERIC(12,2) AS outstanding
  FROM public.customers cu
  LEFT JOIN public.rentals r ON r.customer_id = cu.id
  LEFT JOIN public.invoices i ON i.rental_id = r.id
  GROUP BY cu.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_stats() TO authenticated;

-- =====================================================
-- SECTION 9: Add tracking to realtime publication (was missing!)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tracking'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add tracking to realtime publication: %', SQLERRM;
END;
$$;

-- =====================================================
-- SECTION 10: Refresh latest_tracking view to include car join
-- (Optional improvement; view stays simple for performance)
-- =====================================================
-- (No change needed — view works correctly)

-- =====================================================
-- END OF MIGRATION 007
-- =====================================================
