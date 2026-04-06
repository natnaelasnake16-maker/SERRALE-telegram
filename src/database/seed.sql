-- Serrale Telegram Phase 1 seed data
-- Use only for local or staging environments.

INSERT INTO public.telegram_users (
  telegram_user_id,
  chat_id,
  username,
  first_name,
  last_name,
  language_code,
  is_bot
)
VALUES (
  '1000000001',
  '1000000001',
  'serrale_seed_user',
  'Serrale',
  'Seed',
  'en',
  false
)
ON CONFLICT (telegram_user_id) DO NOTHING;

INSERT INTO public.telegram_session_state (
  telegram_user_id,
  scene_key,
  step_key,
  payload,
  expires_at
)
VALUES (
  '1000000001',
  'onboarding',
  'full_name',
  '{"pending_job_id":null}'::jsonb,
  now() + interval '12 hours'
)
ON CONFLICT (telegram_user_id) DO UPDATE
SET
  scene_key = EXCLUDED.scene_key,
  step_key = EXCLUDED.step_key,
  payload = EXCLUDED.payload,
  expires_at = EXCLUDED.expires_at,
  updated_at = now();
