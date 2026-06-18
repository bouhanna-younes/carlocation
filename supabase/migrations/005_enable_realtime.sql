-- Enable Realtime for all tables
-- Run this in Supabase Dashboard → SQL Editor

-- Check which tables are already in the publication
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Add tables that are not yet in the publication
DO $$
DECLARE
  t TEXT;
  tables_to_add TEXT[] := ARRAY[
    'cars', 'customers', 'rentals', 'maintenance',
    'notifications', 'invoices', 'settings', 'profiles'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_add LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
      RAISE NOTICE 'Added % to realtime', t;
    ELSE
      RAISE NOTICE '% already in realtime', t;
    END IF;
  END LOOP;
END $$;

-- Verify
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;
