-- =====================================================
-- Migration: Car fields update + Invoices + Notifications
-- =====================================================

-- 1. حذف أعمدة غير ضرورية من cars
ALTER TABLE public.cars DROP COLUMN IF EXISTS mileage;
ALTER TABLE public.cars DROP COLUMN IF EXISTS category;
ALTER TABLE public.cars DROP COLUMN IF EXISTS image;
ALTER TABLE public.cars DROP COLUMN IF EXISTS vin;

-- 2. إضافة أعمدة التواريخ في cars
ALTER TABLE public.cars ADD COLUMN insurance_expiry DATE;
ALTER TABLE public.cars ADD COLUMN oil_change_expiry DATE;
ALTER TABLE public.cars ADD COLUMN vignette_expiry DATE;
ALTER TABLE public.cars ADD COLUMN inspection_expiry DATE;

-- 3. إضافة category في notifications
ALTER TABLE public.notifications ADD COLUMN category TEXT DEFAULT 'general';

-- 4. إنشاء جدول invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
  
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  
  daily_rate DOUBLE PRECISION NOT NULL,
  total_days DOUBLE PRECISION NOT NULL,
  total_amount DOUBLE PRECISION NOT NULL,
  deposit_amount DOUBLE PRECISION DEFAULT 0,
  
  is_cancelled BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  penalty_percent DOUBLE PRECISION DEFAULT 0,
  penalty_amount DOUBLE PRECISION DEFAULT 0,
  refund_amount DOUBLE PRECISION DEFAULT 0,
  
  paid_amount DOUBLE PRECISION DEFAULT 0,
  payment_method TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled')),
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_rental_id ON public.invoices(rental_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_created_at ON public.invoices(created_at);

-- 5. Trigger for invoices updated_at
CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoices: read all" ON public.invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Invoices: insert manager" ON public.invoices FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "Invoices: update manager" ON public.invoices FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "Invoices: delete manager" ON public.invoices FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);
