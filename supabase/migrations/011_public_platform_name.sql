-- =====================================================
-- MIGRATION 011: Public platform name function
-- =====================================================
-- Allows the login page (pre-auth) to read the platform
-- name without exposing all settings.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_platform_name()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value jsonb;
  v_name TEXT;
BEGIN
  SELECT value::jsonb INTO v_value FROM public.settings WHERE key = 'platform_info';
  IF v_value IS NOT NULL AND v_value ? 'name' THEN
    v_name := v_value->>'name';
    RETURN COALESCE(NULLIF(TRIM(v_name), ''), 'CarLocation');
  END IF;
  RETURN 'CarLocation';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_name() TO anon, authenticated;

-- =====================================================
-- END OF MIGRATION 011
-- =====================================================
