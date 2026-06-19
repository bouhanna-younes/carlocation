-- =====================================================
-- MIGRATION 010: Revenue from completed rentals + RPC updates
-- =====================================================
-- All functions use CREATE OR REPLACE (idempotent).
-- Safe to run even if migration 007 was partially applied.
-- =====================================================

-- 1. return_rental — atomic return (bypasses RLS)
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

  v_used_days := CEIL(EXTRACT(EPOCH FROM (v_now - v_rental.start_date)) / 86400.0);
  IF v_used_days < 1 THEN v_used_days := 1; END IF;

  v_effective_rate := v_rental.daily_rate;
  IF v_rental.discount_percent IS NOT NULL AND v_rental.discount_percent > 0 THEN
    v_effective_rate := v_rental.daily_rate * (1 - v_rental.discount_percent / 100.0);
  END IF;

  v_final_amount := v_used_days * v_effective_rate;

  UPDATE public.rentals
  SET status = 'completed',
      return_date = v_now,
      total_amount = v_final_amount
  WHERE id = p_rental_id;

  UPDATE public.invoices
  SET return_date = v_now,
      total_days = v_used_days,
      total_amount = v_final_amount,
      status = 'paid',
      paid_amount = v_final_amount
  WHERE rental_id = p_rental_id;

  UPDATE public.cars
  SET status = 'available'
  WHERE id = v_rental.car_id;

  RETURN jsonb_build_object('success', true, 'finalAmount', v_final_amount, 'usedDays', v_used_days);
END;
$body$;

GRANT EXECUTE ON FUNCTION public.return_rental(UUID) TO authenticated;


-- 2. cancel_rental — atomic cancel (bypasses RLS)
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

  BEGIN
    SELECT value::jsonb INTO v_settings_val FROM public.settings WHERE key = 'rental-policy';
    IF v_settings_val IS NOT NULL AND v_settings_val ? 'cancellationPenaltyPercent' THEN
      v_penalty_percent := (v_settings_val->>'cancellationPenaltyPercent')::NUMERIC;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_penalty_percent := 35;
  END;

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

  UPDATE public.rentals
  SET status = 'cancelled',
      total_amount = v_total_amount,
      notes = v_notes
  WHERE id = p_rental_id;

  UPDATE public.invoices
  SET is_cancelled = true,
      cancelled_at = v_now,
      penalty_percent = v_penalty_percent,
      penalty_amount = v_penalty_amount,
      refund_amount = v_refund_amount,
      total_amount = v_total_amount,
      status = 'cancelled'
  WHERE rental_id = p_rental_id;

  UPDATE public.cars
  SET status = 'available'
  WHERE id = v_rental.car_id;

  RETURN jsonb_build_object('success', true, 'totalAmount', v_total_amount, 'penaltyAmount', v_penalty_amount, 'refundAmount', v_refund_amount, 'usedDays', v_used_days);
END;
$body$;

GRANT EXECUTE ON FUNCTION public.cancel_rental(UUID, TEXT) TO authenticated;


-- 3. dashboard_kpis — revenue from completed rentals (not paid invoices)
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
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'available'),
         COUNT(*) FILTER (WHERE status = 'rented'),
         COUNT(*) FILTER (WHERE status = 'maintenance')
  INTO v_total_cars, v_available_cars, v_rented_cars, v_maintenance_cars
  FROM public.cars;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE blacklisted)
  INTO v_total_customers, v_blacklisted
  FROM public.customers;

  SELECT COUNT(*) FILTER (WHERE status = 'active'),
         COUNT(*) FILTER (WHERE status = 'overdue')
  INTO v_active_rentals, v_overdue_rentals
  FROM public.rentals;

  SELECT
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND date_trunc('month', return_date) = date_trunc('month', now())), 0),
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND date_trunc('month', return_date) = date_trunc('month', now() - INTERVAL '1 month')), 0),
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND date_trunc('year', return_date) = date_trunc('year', now())), 0)
  FROM public.rentals
  INTO v_revenue_this_month, v_revenue_last_month, v_revenue_ytd;

  SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
  INTO v_open_invoices_count, v_open_invoices_amount
  FROM public.invoices WHERE status = 'pending';

  SELECT COUNT(*) INTO v_pending_maintenance FROM public.maintenance WHERE status IN ('pending', 'in_progress');

  RETURN jsonb_build_object(
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
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_kpis() TO authenticated;


-- 4. monthly_revenue — from completed rentals (not paid invoices)
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
    COALESCE(SUM(r.total_amount), 0)::NUMERIC(12,2) AS revenue,
    COUNT(r.id)::INTEGER AS count
  FROM (
    VALUES (1, 'جانفي'), (2, 'فيفري'), (3, 'مارس'), (4, 'أفريل'),
           (5, 'ماي'), (6, 'جوان'), (7, 'جويلية'), (8, 'أوت'),
           (9, 'سبتمبر'), (10, 'أكتوبر'), (11, 'نوفمبر'), (12, 'ديسمبر')
  ) AS m(month_index, month_label)
  LEFT JOIN public.rentals r ON EXTRACT(MONTH FROM r.return_date)::INT = m.month_index
                                AND EXTRACT(YEAR FROM r.return_date)::INT = v_year
                                AND r.status = 'completed'
  GROUP BY m.month_index, m.month_label
  ORDER BY m.month_index;
END;
$$;

GRANT EXECUTE ON FUNCTION public.monthly_revenue(INTEGER) TO authenticated;


-- 5. top_cars — revenue from completed rentals directly
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
    COALESCE(SUM(r.total_amount), 0)::NUMERIC(12,2) AS total_revenue,
    COUNT(r.id)::INTEGER AS rentals_count
  FROM public.cars c
  LEFT JOIN public.rentals r ON r.car_id = c.id AND r.status = 'completed'
  GROUP BY c.id, c.brand, c.model, c.plate_number
  ORDER BY total_revenue DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.top_cars(INTEGER) TO authenticated;


-- 6. top_customers — revenue from completed rentals directly
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
    COALESCE(SUM(r.total_amount), 0)::NUMERIC(12,2) AS total_spent,
    COUNT(r.id)::INTEGER AS rentals_count
  FROM public.customers cu
  LEFT JOIN public.rentals r ON r.customer_id = cu.id AND r.status = 'completed'
  GROUP BY cu.id, cu.first_name, cu.last_name
  ORDER BY total_spent DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.top_customers(INTEGER) TO authenticated;


-- 7. customer_stats — from rentals directly
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
    COALESCE(SUM(r.total_amount) FILTER (WHERE r.status = 'completed'), 0)::NUMERIC(12,2) AS total_spent,
    COALESCE(SUM(r.total_amount) FILTER (WHERE r.status IN ('active', 'overdue')), 0)::NUMERIC(12,2) AS outstanding
  FROM public.customers cu
  LEFT JOIN public.rentals r ON r.customer_id = cu.id
  GROUP BY cu.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_stats() TO authenticated;

-- =====================================================
-- END OF MIGRATION 010
-- =====================================================
