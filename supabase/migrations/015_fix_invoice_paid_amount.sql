-- =====================================================
-- MIGRATION 015: Fix invoice paid_amount sync with rental amount_paid
-- =====================================================
-- Problems fixed:
--   1. Old trigger (migration 006) hardcoded paid_amount = 0 on INSERT
--   2. Trigger recalculated total_amount WITHOUT discount (used raw daily_rate)
--   3. return_rental RPC set paid_amount = v_final_amount instead of actual paid
--   4. Existing invoices have paid_amount = 0 even though rentals have amount_paid > 0
--
-- This migration is idempotent (CREATE OR REPLACE, UPDATE WHERE).
-- =====================================================

-- =====================================================
-- 1. Fix auto_invoice_on_rental trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_invoice_on_rental()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invoice_number TEXT;
  v_total_days NUMERIC(10,2);
  v_total_amount NUMERIC(12,2);
  v_effective_rate NUMERIC(12,2);
  v_penalty_percent NUMERIC(5,2) := 35;
  v_penalty_amount NUMERIC(12,2);
  v_refund_amount NUMERIC(12,2);
  v_settings_value jsonb;
  v_paid NUMERIC(12,2);
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

    -- Calculate effective rate WITH discount (matches app-side calculation)
    v_effective_rate := NEW.daily_rate;
    IF NEW.discount_percent IS NOT NULL AND NEW.discount_percent > 0 THEN
      v_effective_rate := NEW.daily_rate * (1 - NEW.discount_percent / 100.0);
    END IF;
    v_total_amount := v_total_days * v_effective_rate;

    -- Use rental's total_amount if it was provided (already calculated by app with discount)
    IF NEW.total_amount IS NOT NULL AND NEW.total_amount > 0 THEN
      v_total_amount := NEW.total_amount;
    END IF;

    v_paid := COALESCE(NEW.amount_paid, 0);

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
      COALESCE(NEW.deposit_amount, 0),
      CASE WHEN v_paid >= v_total_amount AND v_total_amount > 0 THEN 'paid' ELSE 'pending' END,
      v_paid
    );

    RETURN NEW;
  END IF;

  -- UPDATE: Handle status changes
  IF TG_OP = 'UPDATE' THEN
    -- Car returned: update invoice with final amounts
    -- paid_amount and status are managed by return_rental RPC
    IF NEW.status = 'completed' AND OLD.status <> 'completed' AND NEW.return_date IS NOT NULL THEN
      v_total_days := CEIL(EXTRACT(EPOCH FROM (NEW.return_date - NEW.start_date)) / 86400.0);
      IF v_total_days < 1 THEN v_total_days := 1; END IF;

      v_effective_rate := NEW.daily_rate;
      IF NEW.discount_percent IS NOT NULL AND NEW.discount_percent > 0 THEN
        v_effective_rate := NEW.daily_rate * (1 - NEW.discount_percent / 100.0);
      END IF;
      v_total_amount := v_total_days * v_effective_rate;

      IF NEW.total_amount IS NOT NULL AND NEW.total_amount > 0 THEN
        v_total_amount := NEW.total_amount;
      END IF;

      v_paid := COALESCE(NEW.amount_paid, 0);

      UPDATE public.invoices
      SET return_date = NEW.return_date,
          total_days = v_total_days,
          total_amount = v_total_amount,
          paid_amount = v_paid,
          status = CASE WHEN v_paid >= v_total_amount AND v_total_amount > 0 THEN 'paid' ELSE 'pending' END
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

    -- amount_paid updated (e.g., via RPC return_rental): sync to invoice
    IF NEW.amount_paid IS DISTINCT FROM OLD.amount_paid AND NEW.status NOT IN ('completed', 'cancelled') THEN
      v_total_amount := COALESCE(NEW.total_amount, 0);
      v_paid := COALESCE(NEW.amount_paid, 0);

      UPDATE public.invoices
      SET paid_amount = v_paid,
          status = CASE WHEN v_paid >= v_total_amount AND v_total_amount > 0 THEN 'paid' ELSE 'pending' END
      WHERE rental_id = NEW.id;

      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 2. Fix return_rental RPC: paid_amount = actual paid, not final amount
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

  -- 2. Update invoice — paid_amount = actual amount paid by customer
  UPDATE public.invoices
  SET return_date = v_now,
      total_days = v_used_days,
      total_amount = v_final_amount,
      paid_amount = v_total_paid,
      status = CASE WHEN v_total_paid >= v_final_amount THEN 'paid' ELSE 'pending' END
  WHERE rental_id = p_rental_id;

  -- 3. Update car status
  UPDATE public.cars
  SET status = 'available'
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
-- 3. Backfill: Sync existing invoices from rentals' amount_paid
-- =====================================================
UPDATE public.invoices inv
SET paid_amount = COALESCE(r.amount_paid, 0),
    total_amount = COALESCE(r.total_amount, inv.total_amount),
    status = CASE
      WHEN r.status = 'cancelled' THEN 'cancelled'
      WHEN COALESCE(r.amount_paid, 0) >= COALESCE(r.total_amount, 0) AND COALESCE(r.total_amount, 0) > 0 THEN 'paid'
      ELSE 'pending'
    END
FROM public.rentals r
WHERE inv.rental_id = r.id
  AND (
    inv.paid_amount <> COALESCE(r.amount_paid, 0)
    OR inv.paid_amount IS NULL
  );

-- =====================================================
-- END OF MIGRATION 015
-- =====================================================
