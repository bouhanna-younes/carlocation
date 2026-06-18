-- =====================================================
-- MIGRATION 008: Secure latest_tracking view
-- =====================================================
-- Problem: latest_tracking was created as a SECURITY DEFINER view
-- (default in Postgres), which bypasses RLS and exposes all tracking
-- data publicly via the REST API.
--
-- Fix: switch to security_invoker = true so the view runs with the
-- privileges of the querying user and respects RLS on the underlying
-- tracking table (which already restricts SELECT to authenticated
-- users via migration 001).
--
-- This preserves live updates (unlike copying to a static table) and
-- keeps the DISTINCT ON (car_id) ... ORDER BY "timestamp" DESC logic.
-- =====================================================

ALTER VIEW public.latest_tracking SET (security_invoker = true);

-- Re-grant SELECT only to authenticated users (idempotent)
GRANT SELECT ON public.latest_tracking TO authenticated;

-- Ensure anon cannot read the view (revoke any previously granted rights)
REVOKE SELECT ON public.latest_tracking FROM anon;

-- =====================================================
-- END OF MIGRATION 008
-- =====================================================
