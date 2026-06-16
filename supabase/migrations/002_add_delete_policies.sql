-- Add missing DELETE policies for rentals, tracking, and settings
-- This fixes the foreign key constraint error when deleting cars

-- RENTALS: Allow manager to delete (needed for car deletion cascade)
CREATE POLICY "Rentals: delete manager" ON public.rentals FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);

-- TRACKING: Allow manager to delete (needed for car deletion cascade)
CREATE POLICY "Tracking: delete manager" ON public.tracking FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);

-- SETTINGS: Allow manager to delete
CREATE POLICY "Settings: delete manager" ON public.settings FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);
