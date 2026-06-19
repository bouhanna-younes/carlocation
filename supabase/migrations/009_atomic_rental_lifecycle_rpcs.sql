-- =====================================================
-- MIGRATION 009: Atomic rental lifecycle RPCs
-- =====================================================
-- These RPCs bypass RLS (SECURITY DEFINER) so that any
-- authenticated user can return/cancel a rental without
-- needing 'manager' role on the invoices table.
--
-- Each RPC atomically:
--   1. Updates the rental
--   2. Updates the linked invoice
--   3. Updates the car status
-- =====================================================

-- 1. return_rental(p_rental_id)
CREATE OR REPLACE FUNCTION public.return_rental(p_rental_id UUID)
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
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_rental FROM public.rentals WHERE id = p_rental_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكراء غير موجود');
  END IF;

  IF v_rental.status NOT IN ('active', 'overdue') THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن إرجاع كراء غير نشط');
  END IF;

  -- Calculate actual days used
  v_used_days := CEIL(EXTRACT(EPOCH FROM (v_now - v_rental.start_date)) / 86400.0);
  IF v_used_days < 1 THEN v_used_days := 1; END IF;

  -- Apply discount if present
  v_effective_rate := v_rental.daily_rate;
  IF v_rental.discount_percent IS NOT NULL AND v_rental.discount_percent > 0 THEN
    v_effective_rate := v_rental.daily_rate * (1 - v_rental.discount_percent / 100.0);
  END IF;

  v_final_amount := v_used_days * v_effective_rate;

  -- 1. Update rental
  UPDATE public.rentals
  SET status = 'completed',
      return_date = v_now,
      total_amount = v_final_amount
  WHERE id = p_rental_id;

  -- 2. Update invoice — mark as paid (customer pays on return)
  UPDATE public.invoices
  SET return_date = v_now,
      total_days = v_used_days,
      total_amount = v_final_amount,
      status = 'paid',
      paid_amount = v_final_amount
  WHERE rental_id = p_rental_id;

  -- 3. Update car status
  UPDATE public.cars
  SET status = 'available'
  WHERE id = v_rental.car_id;

  RETURN jsonb_build_object('success', true, 'finalAmount', v_final_amount, 'usedDays', v_used_days);
END;
$body$;

-- 2. cancel_rental(p_rental_id, p_reason)
CREATE OR REPLACE FUNCTION public.cancel_rental(p_rental_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $body$
DECLARE
  v_rental RECORD;
  v_used_days NUMERIC(10,2);
  v_used_amount NUMERIC(12,2);
  v_effective_rate NUMERIC(12,2);
  v_penalty_percent NUMERIC(5,2) := 35;
  v_penalty_amount NUMERIC(12,2);
  v_total_amount NUMERIC(12,2);
  v_refund_amount NUMERIC(12,2);
  v_settings_val jsonb;
  v_now TIMESTAMPTZ := now();
  v_notes TEXT;
BEGIN
  SELECT * INTO v_rental FROM public.rentals WHERE id = p_rental_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكراء غير موجود');
  END IF;

  IF v_rental.status NOT IN ('active', 'overdue', 'reserved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن إلغاء كراء مكتمل أو ملغى');
  END IF;

  -- Read cancellation penalty from settings
  BEGIN
    SELECT value::jsonb INTO v_settings_val FROM public.settings WHERE key = 'rental-policy';
    IF v_settings_val IS NOT NULL AND v_settings_val ? 'cancellationPenaltyPercent' THEN
      v_penalty_percent := (v_settings_val->>'cancellationPenaltyPercent')::NUMERIC;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_penalty_percent := 35;
  END;

  -- Calculate used days and amounts
  v_used_days := CEIL(EXTRACT(EPOCH FROM (v_now - v_rental.start_date)) / 86400.0);
  IF v_used_days < 1 THEN v_used_days := 1; END IF;

  v_effective_rate := v_rental.daily_rate;
  IF v_rental.discount_percent IS NOT NULL AND v_rental.discount_percent > 0 THEN
    v_effective_rate := v_rental.daily_rate * (1 - v_rental.discount_percent / 100.0);
  END IF;

  v_used_amount := v_used_days * v_effective_rate;
  v_penalty_amount := v_used_amount * v_penalty_percent / 100.0;
  v_total_amount := v_used_amount + v_penalty_amount;
  v_refund_amount := COALESCE(v_rental.deposit_amount, 0) - v_penalty_amount;
  IF v_refund_amount < 0 THEN v_refund_amount := 0; END IF;

  v_notes := COALESCE(p_reason, 'إلغاء بدون سبب محدد') || ' | استُخدم ' || v_used_days || ' يوم | غرامة ' || v_penalty_percent || '%: ' || v_penalty_amount || ' DZD';

  -- 1. Update rental
  UPDATE public.rentals
  SET status = 'cancelled',
      total_amount = v_total_amount,
      notes = v_notes
  WHERE id = p_rental_id;

  -- 2. Update invoice
  UPDATE public.invoices
  SET is_cancelled = true,
      cancelled_at = v_now,
      penalty_percent = v_penalty_percent,
      penalty_amount = v_penalty_amount,
      refund_amount = v_refund_amount,
      total_amount = v_total_amount,
      status = 'cancelled'
  WHERE rental_id = p_rental_id;

  -- 3. Update car status
  UPDATE public.cars
  SET status = 'available'
  WHERE id = v_rental.car_id;

  RETURN jsonb_build_object(
    'success', true,
    'totalAmount', v_total_amount,
    'penaltyAmount', v_penalty_amount,
    'refundAmount', v_refund_amount,
    'usedDays', v_used_days
  );
END;
$body$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.return_rental(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_rental(UUID, TEXT) TO authenticated;

-- =====================================================
-- END OF MIGRATION 009
-- =====================================================
