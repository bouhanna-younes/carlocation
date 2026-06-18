-- =====================================================
-- Migration: Fix Security Vulnerabilities & Logical Bugs
-- =====================================================

-- 1. Fix privilege escalation via signup metadata
-- Force role to 'worker' regardless of user-supplied metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Protect role column from non-managers
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- 3. Fix invoice RLS - restrict to managers only
DROP POLICY IF EXISTS "Invoices: read all" ON public.invoices;
CREATE POLICY "Invoices: read manager" ON public.invoices FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);

-- 4. Auto-invoice trigger on rentals
CREATE OR REPLACE FUNCTION public.auto_invoice_on_rental()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_total_days DOUBLE PRECISION;
  v_total_amount DOUBLE PRECISION;
  v_penalty_percent DOUBLE PRECISION := 35;
  v_penalty_amount DOUBLE PRECISION;
  v_refund_amount DOUBLE PRECISION;
BEGIN
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
    -- Car returned
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.return_date IS NOT NULL THEN
      v_total_days := CEIL(EXTRACT(EPOCH FROM (NEW.return_date - NEW.start_date)) / 86400.0);
      IF v_total_days < 1 THEN v_total_days := 1; END IF;
      v_total_amount := v_total_days * NEW.daily_rate;

      UPDATE public.invoices
      SET return_date = NEW.return_date,
          total_days = v_total_days,
          total_amount = v_total_amount,
          status = 'paid',
          paid_amount = v_total_amount
      WHERE rental_id = NEW.id;

      RETURN NEW;
    END IF;

    -- Rental cancelled
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoices_number_seq START 1;

CREATE TRIGGER auto_invoice_trigger
  AFTER INSERT OR UPDATE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_on_rental();

-- 5. Create latest_tracking view for performance
CREATE OR REPLACE VIEW public.latest_tracking AS
SELECT DISTINCT ON (car_id)
  id,
  car_id,
  latitude,
  longitude,
  speed,
  heading,
  "timestamp"
FROM public.tracking
ORDER BY car_id, "timestamp" DESC;

-- Grant access to authenticated users
GRANT SELECT ON public.latest_tracking TO authenticated;
