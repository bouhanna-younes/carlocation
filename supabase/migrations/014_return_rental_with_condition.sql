-- =====================================================
-- MIGRATION 014: Updated return_rental RPC with condition fields
-- =====================================================
-- Replaces the version from migration 009/010 with one that
-- accepts car condition at return time.
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
-- END OF MIGRATION 014
-- =====================================================
