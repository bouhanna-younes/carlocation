-- CarLocation Seed Data for Supabase
-- Run this after the schema migration

-- Note: Admin user must be created through Supabase Auth (Dashboard or API)
-- Then the profile will be auto-created by the trigger

-- =====================================================
-- CARS (20 cars)
-- =====================================================
INSERT INTO public.cars (brand, model, year, plate_number, color, daily_rate, status, mileage, fuel_type, seats, transmission, category) VALUES
('Toyota', 'Corolla', 2024, '12345-16-100', 'أبيض', 3000, 'available', 15000, 'بنزين', 5, 'automatic', 'sedan'),
('Hyundai', 'Elantra', 2023, '67890-16-200', 'أسود', 2500, 'available', 32000, 'بنزين', 5, 'automatic', 'sedan'),
('Kia', 'Cerato', 2023, '11223-16-300', 'أزرق', 2800, 'rented', 28000, 'بنزين', 5, 'automatic', 'sedan'),
('Mercedes', 'C200', 2024, '44556-16-400', 'فضي', 8000, 'available', 5000, 'بنزين', 5, 'automatic', 'luxury'),
('Renault', 'Symbol', 2021, '77889-16-500', 'رمادي', 1800, 'maintenance', 85000, 'بنزين', 5, 'manual', 'economy'),
('Peugeot', '208', 2024, '33445-16-600', 'أحمر', 2200, 'available', 8000, 'بنزين', 5, 'automatic', 'economy'),
('Volkswagen', 'Golf 8', 2024, '55667-16-700', 'أسود', 4500, 'available', 12000, 'بنزين', 5, 'automatic', 'sedan'),
('Dacia', 'Duster', 2023, '88990-16-800', 'أخضر', 3500, 'rented', 45000, 'ديزل', 5, 'manual', 'suv'),
('Toyota', 'Hilux', 2024, '22334-16-900', 'أبيض', 5000, 'available', 20000, 'ديزل', 5, 'manual', 'truck'),
('Hyundai', 'Tucson', 2024, '44556-16-110', 'ذهبي', 5500, 'available', 10000, 'بنزين', 5, 'automatic', 'suv'),
('Renault', 'Megane', 2022, '66778-16-120', 'أزرق', 2600, 'available', 55000, 'بنزين', 5, 'manual', 'sedan'),
('Ford', 'Transit', 2023, '88990-16-130', 'أبيض', 6000, 'available', 35000, 'ديزل', 12, 'manual', 'van'),
('BMW', 'X3', 2024, '11223-16-140', 'أسود', 9000, 'rented', 7000, 'بنزين', 5, 'automatic', 'luxury'),
('Citroen', 'C3', 2023, '33445-16-150', 'فضي', 1900, 'available', 40000, 'بنزين', 5, 'manual', 'economy'),
('Nissan', 'Qashqai', 2024, '55667-16-160', 'أحمر', 4800, 'out_of_service', 18000, 'هجينة', 5, 'automatic', 'suv'),
('Opel', 'Corsa', 2022, '77889-16-170', 'أبيض', 1700, 'available', 62000, 'بنزين', 5, 'manual', 'economy'),
('Toyota', 'RAV4', 2024, '99001-16-180', 'رمادي', 6500, 'available', 3000, 'هجينة', 5, 'automatic', 'suv'),
('Mercedes', 'Sprinter', 2023, '22334-16-190', 'أبيض', 7000, 'available', 28000, 'ديزل', 16, 'manual', 'van'),
('Fiat', '500', 2024, '44556-16-210', 'أحمر', 2000, 'available', 5000, 'كهرباء', 4, 'automatic', 'economy'),
('Hyundai', 'i20', 2023, '66778-16-220', 'أخضر', 1600, 'maintenance', 70000, 'بنزين', 5, 'manual', 'economy');

-- =====================================================
-- CUSTOMERS (10 customers)
-- =====================================================
INSERT INTO public.customers (first_name, last_name, phone, email, address, id_number, driver_license_number, driver_license_expiry, notes) VALUES
('محمد', 'بن علي', '0555123456', 'mohamed@email.com', 'الجزائر العاصمة', '1980012345678', 'DZ-12345678', '2027-06-15', 'عميل منتظم'),
('فاطمة', 'الزهراء', '0661234567', 'fatima@email.com', 'وهران', '1985023456789', 'DZ-23456789', '2026-12-01', ''),
('عبد الرحمن', 'بوزيد', '0770123456', null, 'قسنطينة', '1990034567890', 'DZ-34567890', '2028-03-20', 'يفضل الأوتوماتيك'),
('أمينة', 'خالدي', '0550123456', 'amina@email.com', 'عنابة', '1995045678901', 'DZ-45678901', '2025-01-15', 'رخصة منتهية'),
('كريم', 'مديوني', '0660123456', 'karim@email.com', 'سطيف', '1988056789012', 'DZ-56789012', '2027-09-30', ''),
('ليلى', 'عمراوي', '0771123456', 'laila@email.com', 'تلمسان', '1992067890123', 'DZ-67890123', '2026-05-20', 'عميلة VIP'),
('يوسف', 'سعيدوني', '0552123456', 'youssef@email.com', 'بجاية', '1993078901234', 'DZ-78901234', '2029-01-10', ''),
('نادية', 'بلحاج', '0662123456', null, 'المدية', '1996089012345', 'DZ-89012345', '2027-11-25', ''),
('رضا', 'تواتي', '0772123456', 'reda@email.com', 'بومرداس', '1991090123456', 'DZ-90123456', '2026-08-15', 'مشاكل في الدفع'),
('سارة', 'حميدوش', '0553123456', 'sara@email.com', 'الجزائر العاصمة', '2000101234567', 'DZ-01234567', '2030-04-20', 'طالبة');

-- Mark blacklisted customer
UPDATE public.customers SET blacklisted = true, blacklist_reason = 'تأخر في الدفع أكثر من 3 مرات' WHERE phone = '0772123456';

-- =====================================================
-- SETTINGS
-- =====================================================
INSERT INTO public.settings (key, value) VALUES
('platform-info', '{"name":"CarLocation","address":"الجزائر العاصمة","phone":"021123456","email":"contact@carlocation.dz"}'),
('pricing', '{"dailyRate":3000,"weeklyRate":18000,"monthlyRate":65000,"securityDeposit":50000}'),
('rental-policy', '{"minDuration":1,"maxDuration":90,"lateFeePerDay":1500}');
