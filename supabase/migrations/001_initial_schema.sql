-- CarLocation Database Schema for Supabase
-- This replaces the Prisma schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('manager', 'worker')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- CARS TABLE
-- =====================================================
CREATE TABLE public.cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  plate_number TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  daily_rate DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance', 'out_of_service')),
  mileage INTEGER NOT NULL DEFAULT 0,
  fuel_type TEXT NOT NULL,
  seats INTEGER NOT NULL,
  image TEXT,
  vin TEXT UNIQUE,
  transmission TEXT NOT NULL DEFAULT 'manual' CHECK (transmission IN ('manual', 'automatic')),
  category TEXT NOT NULL DEFAULT 'economy' CHECK (category IN ('economy', 'sedan', 'suv', 'luxury', 'van', 'truck')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cars_status ON public.cars(status);
CREATE INDEX idx_cars_brand ON public.cars(brand);

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  address TEXT,
  id_number TEXT UNIQUE,
  driver_license_number TEXT,
  driver_license_expiry TEXT,
  date_of_birth TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  blacklisted BOOLEAN NOT NULL DEFAULT false,
  blacklist_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- RENTALS TABLE
-- =====================================================
CREATE TABLE public.rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
  renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  daily_rate DOUBLE PRECISION NOT NULL,
  total_amount DOUBLE PRECISION,
  deposit_amount DOUBLE PRECISION,
  deposit_paid BOOLEAN NOT NULL DEFAULT false,
  deposit_refunded BOOLEAN NOT NULL DEFAULT false,
  start_mileage INTEGER,
  end_mileage INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled', 'reserved')),
  notes TEXT,
  discount_percent DOUBLE PRECISION DEFAULT 0,
  discount_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rentals_status ON public.rentals(status);
CREATE INDEX idx_rentals_car_id ON public.rentals(car_id);
CREATE INDEX idx_rentals_customer_id ON public.rentals(customer_id);
CREATE INDEX idx_rentals_renter_id ON public.rentals(renter_id);
CREATE INDEX idx_rentals_end_date ON public.rentals(end_date);
CREATE INDEX idx_rentals_created_at ON public.rentals(created_at);

-- =====================================================
-- MAINTENANCE TABLE
-- =====================================================
CREATE TABLE public.maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  cost DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  vendor_name TEXT,
  vendor_phone TEXT,
  mileage_at_start INTEGER,
  mileage_at_completion INTEGER,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_car_id ON public.maintenance(car_id);
CREATE INDEX idx_maintenance_status ON public.maintenance(status);

-- =====================================================
-- TRACKING TABLE
-- =====================================================
CREATE TABLE public.tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracking_car_id ON public.tracking(car_id);
CREATE INDEX idx_tracking_timestamp ON public.tracking("timestamp");

-- =====================================================
-- SETTINGS TABLE
-- =====================================================
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- =====================================================
-- AUTO-UPDATE TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_cars BEFORE UPDATE ON public.cars FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_customers BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_rentals BEFORE UPDATE ON public.rentals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_maintenance BEFORE UPDATE ON public.maintenance FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_settings BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can read all profiles, but only update their own
CREATE POLICY "Profiles: read all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- CARS: Authenticated users can read all cars
CREATE POLICY "Cars: read all" ON public.cars FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Cars: insert manager" ON public.cars FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "Cars: update manager" ON public.cars FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "Cars: delete manager" ON public.cars FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);

-- CUSTOMERS: Same pattern as cars
CREATE POLICY "Customers: read all" ON public.customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Customers: insert manager" ON public.customers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "Customers: update manager" ON public.customers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "Customers: delete manager" ON public.customers FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);

-- RENTALS: Authenticated can read, anyone can create, manager can update/delete
CREATE POLICY "Rentals: read all" ON public.rentals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Rentals: insert authenticated" ON public.rentals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Rentals: update manager" ON public.rentals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);

-- MAINTENANCE: Same pattern
CREATE POLICY "Maintenance: read all" ON public.maintenance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Maintenance: insert manager" ON public.maintenance FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "Maintenance: update manager" ON public.maintenance FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "Maintenance: delete manager" ON public.maintenance FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);

-- TRACKING: Authenticated can read, manager can insert
CREATE POLICY "Tracking: read all" ON public.tracking FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Tracking: insert manager" ON public.tracking FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);

-- SETTINGS: Authenticated can read, manager can update
CREATE POLICY "Settings: read all" ON public.settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Settings: insert manager" ON public.settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "Settings: update manager" ON public.settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);

-- NOTIFICATIONS: Authenticated can read and update own
CREATE POLICY "Notifications: read all" ON public.notifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Notifications: insert manager" ON public.notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "Notifications: update all" ON public.notifications FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Notifications: delete all" ON public.notifications FOR DELETE USING (auth.role() = 'authenticated');
