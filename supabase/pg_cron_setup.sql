-- =============================================
-- pg_cron setup for automated BCV rate fetching
-- Run this in Supabase SQL Editor AFTER deploying the Edge Function
-- =============================================

-- 1. Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Schedule the BCV rates sync every 6 hours
-- Note: Replace YOUR_PROJECT_REF with your actual Supabase project reference
SELECT cron.schedule(
  'bcv-rates-sync',              -- job name
  '0 */6 * * *',                 -- every 6 hours (0:00, 6:00, 12:00, 18:00)
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/bcv-rates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =============================================
-- Useful commands for managing the cron job
-- =============================================

-- View all scheduled jobs:
-- SELECT * FROM cron.job;

-- View job execution history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Unschedule the job:
-- SELECT cron.unschedule('bcv-rates-sync');

-- Manually trigger the function (for testing):
-- SELECT net.http_post(
--   url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/bcv-rates',
--   headers := '{"Content-Type": "application/json"}'::jsonb,
--   body := '{}'::jsonb
-- );
