-- Serrale Telegram Phase 1
-- Apply this file against the same Supabase project used by the main Serrale apps.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_registration_source_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_registration_source_check
  CHECK (
    registration_source IS NULL OR registration_source IN (
      'site_registration',
      'google_form',
      'admin_manual_entry',
      'csv_import',
      'ai_agent_entry',
      'telegram_bot'
    )
  );

ALTER TABLE public.registration_intakes DROP CONSTRAINT IF EXISTS registration_intakes_source_check;
ALTER TABLE public.registration_intakes
  ADD CONSTRAINT registration_intakes_source_check
  CHECK (
    registration_source IN (
      'site_registration',
      'google_form',
      'admin_manual_entry',
      'csv_import',
      'ai_agent_entry',
      'telegram_bot'
    )
  );

CREATE SEQUENCE IF NOT EXISTS public.serrale_profile_id_seq START 1;

CREATE OR REPLACE FUNCTION public.next_serrale_profile_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_value bigint;
BEGIN
  next_value := nextval('public.serrale_profile_id_seq');
  RETURN 'SER-' || lpad(next_value::text, 5, '0');
END;
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS serrale_id text;

ALTER TABLE public.profiles
  ALTER COLUMN serrale_id SET DEFAULT public.next_serrale_profile_id();

UPDATE public.profiles
SET serrale_id = public.next_serrale_profile_id()
WHERE serrale_id IS NULL;

DO $$
DECLARE
  max_serrale_id bigint;
BEGIN
  SELECT max(NULLIF(regexp_replace(serrale_id, '[^0-9]', '', 'g'), '')::bigint)
  INTO max_serrale_id
  FROM public.profiles
  WHERE serrale_id IS NOT NULL;

  IF COALESCE(max_serrale_id, 0) > 0 THEN
    PERFORM setval('public.serrale_profile_id_seq', max_serrale_id, true);
  ELSE
    PERFORM setval('public.serrale_profile_id_seq', 1, false);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_serrale_id_unique
  ON public.profiles(serrale_id)
  WHERE serrale_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.telegram_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text NOT NULL UNIQUE,
  chat_id text,
  username text,
  first_name text,
  last_name text,
  language_code text,
  is_bot boolean NOT NULL DEFAULT false,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  current_intake_id uuid REFERENCES public.registration_intakes(id) ON DELETE SET NULL,
  linked_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_users_profile_id_unique
  ON public.telegram_users(profile_id)
  WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telegram_users_last_seen_at
  ON public.telegram_users(last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_profile_id
  ON public.telegram_link_tokens(profile_id);

CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_expires_at
  ON public.telegram_link_tokens(expires_at);

CREATE TABLE IF NOT EXISTS public.telegram_channel_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  channel_chat_id text NOT NULL,
  channel_message_id text NOT NULL,
  channel_username text NOT NULL,
  status text NOT NULL DEFAULT 'posted',
  posted_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  posted_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telegram_channel_posts_status_check CHECK (status IN ('posted', 'closed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_channel_posts_active_job
  ON public.telegram_channel_posts(job_id)
  WHERE status = 'posted';

CREATE INDEX IF NOT EXISTS idx_telegram_channel_posts_job_id
  ON public.telegram_channel_posts(job_id);

CREATE INDEX IF NOT EXISTS idx_telegram_channel_posts_status
  ON public.telegram_channel_posts(status, posted_at DESC);

CREATE TABLE IF NOT EXISTS public.telegram_session_state (
  telegram_user_id text PRIMARY KEY REFERENCES public.telegram_users(telegram_user_id) ON DELETE CASCADE,
  scene_key text NOT NULL,
  step_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_session_state DROP CONSTRAINT IF EXISTS telegram_session_state_step_check;
ALTER TABLE public.telegram_session_state
  ADD CONSTRAINT telegram_session_state_step_check
  CHECK (step_key IN ('full_name', 'city', 'city_other', 'role', 'category'));

CREATE INDEX IF NOT EXISTS idx_telegram_session_state_expires_at
  ON public.telegram_session_state(expires_at);

ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_channel_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_session_state ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.telegram_job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  telegram_user_id text NOT NULL REFERENCES public.telegram_users(telegram_user_id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  cv_file_url text,
  cv_file_name text,
  note text,
  status text NOT NULL DEFAULT 'submitted',
  source text NOT NULL DEFAULT 'telegram_bot',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  promoted_to_proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telegram_job_applications_status_check CHECK (status IN ('submitted', 'reviewed', 'promoted')),
  CONSTRAINT telegram_job_applications_source_check CHECK (source = 'telegram_bot')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_job_applications_unique_user_job
  ON public.telegram_job_applications(job_id, telegram_user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_job_applications_job_id
  ON public.telegram_job_applications(job_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_job_applications_telegram_user_id
  ON public.telegram_job_applications(telegram_user_id, submitted_at DESC);

ALTER TABLE public.telegram_job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own telegram linkage" ON public.telegram_users;
CREATE POLICY "Users can view own telegram linkage"
  ON public.telegram_users
  FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own telegram linkage" ON public.telegram_users;
CREATE POLICY "Users can update own telegram linkage"
  ON public.telegram_users
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can view own telegram applications" ON public.telegram_job_applications;
CREATE POLICY "Users can view own telegram applications"
  ON public.telegram_job_applications
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE OR REPLACE VIEW public.telegram_publishable_jobs_v1 AS
SELECT
  j.id,
  j.title,
  j.category,
  j.city,
  j.budget,
  j.budget_min,
  j.budget_max,
  j.job_type,
  j.duration,
  j.location_type,
  j.status,
  j.description,
  j.experience_level,
  j.created_at,
  COALESCE(p.full_name, p.name) AS client_name,
  COALESCE(active_posts.active_post_count, 0)::bigint AS active_post_count
FROM public.jobs j
LEFT JOIN public.profiles p ON p.id = j.client_id
LEFT JOIN LATERAL (
  SELECT count(*) AS active_post_count
  FROM public.telegram_channel_posts tcp
  WHERE tcp.job_id = j.id
    AND tcp.status = 'posted'
) active_posts ON true
WHERE lower(COALESCE(j.status, '')) = 'open'
  AND COALESCE(active_posts.active_post_count, 0) = 0;
