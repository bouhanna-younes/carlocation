-- CarLocation Seed Data for Supabase
-- Run this after the schema migration
-- Idempotent: uses ON CONFLICT to allow re-runs

-- Note: Admin user must be created through Supabase Auth (Dashboard or API)
-- Then the profile will be auto-created by the trigger

-- =====================================================
-- CARS (20 cars)
-- =====================================================
INSERT INTO public.cars (brand, model, year, plate_number, color, daily_rate, status, fuel_type, seats, transmission, insurance_expiry, oil_change_expiry, vignette_expiry, inspection_expiry) VALUES
('Toyota', 'Corolla', 2024, '12345-16-100', 'أبيض', 3000, 'available', 'بنزين', 5, 'automatic', '2027-01-15', '2026-09-01', '2026-12-31', '2027-03-20'),
('Hyundai', 'Elantra', 2023, '67890-16-200', 'أسود', 2500, 'available', 'بنزين', 5, 'automatic', '2026-11-01', '2026-07-15', '2026-10-31', '2027-01-10'),
('Kia', 'Cerato', 2023, '11223-16-300', 'أزرق', 2800, 'rented', 'بنزين', 5, 'automatic', '2026-08-20', '2026-06-10', '2026-09-30', '2026-12-15'),
('Mercedes', 'C200', 2024, '44556-16-400', 'فضي', 8000, 'available', 'بنزين', 5, 'automatic', '2027-05-01', '2027-02-01', '2027-06-30', '2027-08-15'),
('Renault', 'Symbol', 2021, '77889-16-500', 'رمادي', 1800, 'maintenance', 'بنزين', 5, 'manual', '2026-06-30', '2026-05-15', '2026-07-31', '2026-09-01'),
('Peugeot', '208', 2024, '33445-16-600', 'أحمر', 2200, 'available', 'بنزين', 5, 'automatic', '2027-04-10', '2026-11-20', '2027-01-31', '2027-05-01'),
('Volkswagen', 'Golf 8', 2024, '55667-16-700', 'أسود', 4500, 'available', 'بنزين', 5, 'automatic', '2027-03-15', '2026-12-01', '2027-02-28', '2027-04-30'),
('Dacia', 'Duster', 2023, '88990-16-800', 'أخضر', 3500, 'rented', 'ديزل', 5, 'manual', '2026-10-01', '2026-08-15', '2026-11-30', '2027-02-01'),
('Toyota', 'Hilux', 2024, '22334-16-900', 'أبيض', 5000, 'available', 'ديزل', 5, 'manual', '2027-06-01', '2027-01-10', '2027-03-31', '2027-07-15'),
('Hyundai', 'Tucson', 2024, '44556-16-110', 'ذهبي', 5500, 'available', 'بنزين', 5, 'automatic', '2027-02-15', '2026-10-20', '2027-01-15', '2027-03-30'),
('Renault', 'Megane', 2022, '66778-16-120', 'أزرق', 2600, 'available', 'بنزين', 5, 'manual', '2026-07-01', '2026-04-15', '2026-08-31', '2026-11-01'),
('Ford', 'Transit', 2023, '88990-16-130', 'أبيض', 6000, 'available', 'ديزل', 12, 'manual', '2026-09-15', '2026-07-01', '2026-10-31', '2027-01-15'),
('BMW', 'X3', 2024, '11223-16-140', 'أسود', 9000, 'rented', 'بنزين', 5, 'automatic', '2027-07-01', '2027-03-01', '2027-05-31', '2027-09-01'),
('Citroen', 'C3', 2023, '33445-16-150', 'فضي', 1900, 'available', 'بنزين', 5, 'manual', '2026-08-10', '2026-05-20', '2026-09-15', '2026-12-01'),
('Nissan', 'Qashqai', 2024, '55667-16-160', 'أحمر', 4800, 'out_of_service', 'هجينة', 5, 'automatic', '2027-01-20', '2026-11-01', '2027-02-15', '2027-04-20'),
('Opel', 'Corsa', 2022, '77889-16-170', 'أبيض', 1700, 'available', 'بنزين', 5, 'manual', '2026-06-15', '2026-03-10', '2026-07-20', '2026-10-01'),
('Toyota', 'RAV4', 2024, '99001-16-180', 'رمادي', 6500, 'available', 'هجينة', 5, 'automatic', '2027-04-05', '2027-01-15', '2027-03-10', '2027-06-01'),
('Mercedes', 'Sprinter', 2023, '22334-16-190', 'أبيض', 7000, 'available', 'ديزل', 16, 'manual', '2026-10-15', '2026-08-01', '2026-11-30', '2027-02-15'),
('Fiat', '500', 2024, '44556-16-210', 'أحمر', 2000, 'available', 'كهرباء', 4, 'automatic', '2027-05-10', '2027-02-20', '2027-04-30', '2027-07-01'),
('Hyundai', 'i20', 2023, '66778-16-220', 'أخضر', 1600, 'maintenance', 'بنزين', 5, 'manual', '2026-07-20', '2026-04-30', '2026-08-15', '2026-11-10')
ON CONFLICT (plate_number) DO UPDATE SET
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  year = EXCLUDED.year,
  color = EXCLUDED.color,
  daily_rate = EXCLUDED.daily_rate,
  status = EXCLUDED.status,
  fuel_type = EXCLUDED.fuel_type,
  seats = EXCLUDED.seats,
  transmission = EXCLUDED.transmission,
  insurance_expiry = EXCLUDED.insurance_expiry,
  oil_change_expiry = EXCLUDED.oil_change_expiry,
  vignette_expiry = EXCLUDED.vignette_expiry,
  inspection_expiry = EXCLUDED.inspection_expiry;

-- =====================================================
-- CUSTOMERS (10 customers)
-- =====================================================
INSERT INTO public.customers (first_name, last_name, phone, email, address, id_number, driver_license_number, driver_license_expiry, date_of_birth, notes) VALUES
('محمد', 'بن علي', '0555123456', 'mohamed@email.com', 'الجزائر العاصمة', '1980012345678', 'DZ-12345678', '2027-06-15', '1980-03-10', 'عميل منتظم'),
('فاطمة', 'الزهراء', '0661234567', 'fatima@email.com', 'وهران', '1985023456789', 'DZ-23456789', '2026-12-01', '1985-07-22', ''),
('عبد الرحمن', 'بوزيد', '0770123456', null, 'قسنطينة', '1990034567890', 'DZ-34567890', '2028-03-20', '1990-11-05', 'يفضل الأوتوماتيك'),
('أمينة', 'خالدي', '0550123456', 'amina@email.com', 'عنابة', '1995045678901', 'DZ-45678901', '2025-01-15', '1995-02-14', 'رخصة منتهية'),
('كريم', 'مديوني', '0660123456', 'karim@email.com', 'سطيف', '1988056789012', 'DZ-56789012', '2027-09-30', '1988-09-18', ''),
('ليلى', 'عمراوي', '0771123456', 'laila@email.com', 'تلمسان', '1992067890123', 'DZ-67890123', '2026-05-20', '1992-12-03', 'عميلة VIP'),
('يوسف', 'سعيدوني', '0552123456', 'youssef@email.com', 'بجاية', '1993078901234', 'DZ-78901234', '2029-01-10', '1993-06-25', ''),
('نادية', 'بلحاج', '0662123456', null, 'المدية', '1996089012345', 'DZ-89012345', '2027-11-25', '1996-04-12', ''),
('رضا', 'تواتي', '0772123456', 'reda@email.com', 'بومرداس', '1991090123456', 'DZ-90123456', '2026-08-15', '1991-08-30', 'مشاكل في الدفع'),
('سارة', 'حميدوش', '0553123456', 'sara@email.com', 'الجزائر العاصمة', '2000101234567', 'DZ-01234567', '2030-04-20', '2000-01-15', 'طالبة')
ON CONFLICT (phone) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  address = EXCLUDED.address,
  id_number = EXCLUDED.id_number,
  driver_license_number = EXCLUDED.driver_license_number,
  driver_license_expiry = EXCLUDED.driver_license_expiry,
  date_of_birth = EXCLUDED.date_of_birth,
  notes = EXCLUDED.notes;

-- Mark blacklisted customer
UPDATE public.customers SET blacklisted = true, blacklist_reason = 'تأخر في الدفع أكثر من 3 مرات' WHERE phone = '0772123456';

-- =====================================================
-- SETTINGS
-- =====================================================
INSERT INTO public.settings (key, value) VALUES
('platform-info', '{"name":"CarLocation","address":"الجزائر العاصمة","phone":"021123456","email":"contact@carlocation.dz"}'::jsonb),
('pricing', '{"dailyRate":3000,"weeklyRate":18000,"monthlyRate":65000,"securityDeposit":50000}'::jsonb),
('rental-policy', '{"minDuration":1,"maxDuration":90,"lateFeePerDay":1500,"cancellationPenaltyPercent":35}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
