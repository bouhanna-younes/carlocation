-- Add metadata column to notifications for storing car_id and other data
ALTER TABLE public.notifications ADD COLUMN metadata TEXT;
