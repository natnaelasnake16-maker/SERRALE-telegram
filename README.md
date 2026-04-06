# Serrale Telegram

Telegram acquisition, channel distribution, Mini App job detail, and lightweight apply layer for Serrale.

This service is not a second marketplace and not a second database. It runs as its own Render service, but it stays connected to the same Supabase project and the same Serrale business tables.

## What Phase 2 Adds

- Telegram channel job publishing backed by `jobs` and `telegram_channel_posts`
- compact bot menus for browse, save, status, and admin actions
- Mini App job detail card under `/mini-app`
- lightweight Telegram applications stored in `telegram_job_applications`
- CV upload through Supabase Storage
- admin Telegram review commands for Telegram-origin applications
- mobile-style consistency updates on key Serrale web pages

Canonical Serrale systems remain:

- main backend for core business logic and profile ownership
- existing `profiles`, `jobs`, `saved_jobs`, `proposals`, and `registration_intakes`
- existing web job pages and profile flows

## Files That Matter

- Telegram service migration:
  - `src/database/migrations.sql`
- Standalone copy of the production-safe migration for this repo:
  - `20260405_001_telegram_identity_layer.sql`
- Telegram entrypoint:
  - `src/index.ts`
- Mini App HTTP routes:
  - `src/http/routes/mini-app.ts`
- Mini App static UI:
  - `src/mini-app/index.html`

## Exact Environment Variables

Copy this into the Render environment for the `serrale-telegram` service:

```env
TELEGRAM_BOT_TOKEN=<telegram-bot-token>
TELEGRAM_BOT_USERNAME=<telegram-bot-username-without-@>
TELEGRAM_WEBHOOK_SECRET=<long-random-secret>
TELEGRAM_WEBHOOK_URL=https://telegram.serrale.com/telegram/webhook/<same-secret>
TELEGRAM_APP_URL=https://telegram.serrale.com
TELEGRAM_CHANNEL_USERNAME=@SerraleJobs
TELEGRAM_ADMIN_IDS=123456789,987654321
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
SERRALE_WEB_URL=https://serrale.com
TELEGRAM_UPLOAD_BUCKET=deliverables
TELEGRAM_MAX_UPLOAD_MB=10
PORT=3400
NODE_ENV=production
LOG_LEVEL=info
```

Notes:

- `TELEGRAM_APP_URL` must be the public base URL of the Telegram service, not the webhook path.
- `TELEGRAM_WEBHOOK_SECRET` and the secret in `TELEGRAM_WEBHOOK_URL` must match.
- `TELEGRAM_BOT_USERNAME` should not include `@`.
- `SUPABASE_SERVICE_ROLE_KEY` is required because this service writes Telegram linkage, uploads, and lightweight applications.

## Database Changes To Apply

Run only one canonical migration for production. If you are deploying from this standalone Telegram repo, use:

```sql
-- Apply this file in Supabase SQL Editor:
-- 20260405_001_telegram_identity_layer.sql
```

It adds or maintains:

- `telegram_users`
- `telegram_link_tokens`
- `telegram_channel_posts`
- `telegram_session_state`
- `telegram_job_applications`
- `telegram_publishable_jobs_v1`
- `profiles.serrale_id`
- `telegram_bot` as a valid registration source

These changes are additive only. They do not replace or fork the main Serrale schema.

## What The DB Checks Enforce

The migration includes these important guards:

- `profiles.registration_source` accepts `telegram_bot`
- `registration_intakes.registration_source` accepts `telegram_bot`
- `telegram_channel_posts.status` is limited to `posted` or `closed`
- `telegram_job_applications.status` is limited to `submitted`, `reviewed`, or `promoted`
- `telegram_job_applications.source` is fixed to `telegram_bot`
- unique active channel post per job via:
  - `idx_telegram_channel_posts_active_job`
- unique Telegram application per Telegram user per job via:
  - `idx_telegram_job_applications_unique_user_job`
- `serrale_id` stays unique on `profiles`

## Render Deployment

The repo already includes a Render blueprint entry in [`render.yaml`](/Users/terusew/Downloads/serrale---professional-services-marketplace%20(1)/render.yaml).

For a manual Render service, use:

- Service type: `Web Service`
- Runtime: `Node`
- Root directory: repo root
- Build command:

```bash
cd serrale-telegram && npm install && npm run build
```

- Start command:

```bash
cd serrale-telegram && npm start
```

Health check:

```text
GET /health
```

Webhook endpoint:

```text
POST /telegram/webhook/:secret
```

Recommended public URL pattern:

```text
https://telegram.serrale.com
```

Then set:

- `TELEGRAM_APP_URL=https://telegram.serrale.com`
- `TELEGRAM_WEBHOOK_URL=https://telegram.serrale.com/telegram/webhook/<secret>`

## BotFather And Telegram Setup

1. Create or manage the bot in BotFather.
2. Set the correct token in `TELEGRAM_BOT_TOKEN`.
3. Add the bot to `@SerraleJobs` as an admin.
4. Allow the bot to:
   - post messages
   - edit messages
   - manage inline buttons
5. If you want the Mini App to feel native inside Telegram, configure the bot menu button or Web App entry to point at:

```text
https://telegram.serrale.com/mini-app
```

## What Security Is Active

Current security checks in this service:

- webhook route is secret-protected:
  - `POST /telegram/webhook/:secret`
- Mini App requests validate Telegram init data in production
- local development can bypass init validation only through explicit dev query/header fallbacks
- admin actions are protected by `TELEGRAM_ADMIN_IDS` plus linked admin role checks
- save/unsave requires a linked Serrale profile
- CV uploads are restricted to:
  - PDF
  - DOC
  - DOCX
- CV uploads are size-limited by `TELEGRAM_MAX_UPLOAD_MB`
- duplicate active channel posts are blocked at DB level
- duplicate Telegram applications per user per job are blocked at DB and service level
- bot linking still uses the secure web-generated single-use token flow
- application eligibility is enforced server-side, not by client-only UI state

## What Error Handling Exists

Runtime protections already wired:

- `/health` checks DB access and returns `503` when the service is degraded
- webhook failures are logged and return `500`
- Mini App bootstrap, save, upload, and apply endpoints return structured JSON errors
- invalid Telegram init data returns `401`
- missing link state for save returns `403`
- duplicate application attempts return `400`
- closed or missing jobs return `404` or `400` depending on state
- upload validation returns `400` with a direct error message

The Mini App UI surfaces those API failures as compact toast messages instead of silent failures.

## Operational Checks Before Going Live

Run these in order:

1. Apply the DB migration in Supabase.
2. Confirm the upload bucket exists:
   - `deliverables` by default
3. Deploy the Render service.
4. Open:
   - `GET https://telegram.serrale.com/health`
5. Confirm webhook registration by checking startup logs.
6. Publish one test job with `/postjob <jobId>`.
7. Tap the channel CTA and verify:
   - bot deep link opens
   - Mini App loads
   - save works for linked users
   - unlinked users can still submit lightweight applications
   - CV upload succeeds
8. Run `/applications <jobId>` in the bot to confirm admin review visibility.

## Local Development

```bash
cd serrale-telegram
npm install
npm run dev
```

In local development:

- bot runs in polling mode
- Mini App validation can use a dev `telegramUserId` query param fallback

Examples:

- bot health:
  - `http://localhost:3400/health`
- Mini App local dev:
  - `http://localhost:3400/mini-app?telegramUserId=123456789&jobId=<job-id>&view=job`

## Admin Command Summary

- `/listjobs`
- `/postjob <jobId>`
- `/closejob <jobId>`
- `/applications <jobId>`
- `/applicant <applicationId>`
- `/markreviewed <applicationId>`

## Failure Modes To Watch In Logs

- `TELEGRAM_INIT_INVALID`
  - Mini App opened without valid Telegram init data in production
- `JOB_APPLY_FAILED`
  - validation failure, duplicate apply, or closed job
- `CV_UPLOAD_FAILED`
  - file type, file size, or bucket/storage issue
- `MINI_APP_BOOTSTRAP_FAILED`
  - job lookup, status lookup, or auth context problem
- `Telegram webhook processing failed`
  - webhook secret mismatch or Telegram payload failure
- `Telegram health check failed`
  - Supabase connectivity or service-role issue

## Important Boundary

This service stays in sync with the current Serrale system because it:

- reuses the same Supabase project
- reuses the same `profiles`, `jobs`, `saved_jobs`, and `registration_intakes`
- does not create a Telegram-only jobs system
- does not replace the main proposal model
- stores Telegram applications separately until you choose to promote them later
