# Serrale Telegram

Dedicated Telegram service inside the Serrale repo for phase 1. It reuses the existing Supabase project and Serrale marketplace tables instead of creating a second backend or second user system.

## What Phase 1 Does

- Tracks Telegram users in Supabase
- Links Telegram accounts to existing Serrale profiles through a secure web-generated token
- Captures the lightweight identity layer in private bot chat
- Issues readable Serrale IDs like `SER-00847`
- Creates synced lightweight Serrale `profiles` rows on first completed identity flow
- Creates provider intake lineage in `registration_intakes`
- Browses and searches open jobs for verified provider-side users
- Saves jobs for linked users
- Manually publishes selected jobs to `@SerraleJobs`
- Closes published jobs from Telegram

Proposal submission stays on the web app at `https://serrale.com/job/:id`.

## Folder Layout

```text
serrale-telegram/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── index.ts
    ├── config/index.ts
    ├── types/index.ts
    ├── utils/
    │   ├── formatters.ts
    │   ├── keyboards.ts
    │   └── logger.ts
    ├── services/
    │   ├── supabase.ts
    │   ├── user.service.ts
    │   ├── job.service.ts
    │   └── channel.service.ts
    ├── bot/
    │   ├── index.ts
    │   ├── middleware/auth.ts
    │   ├── scenes/onboarding.ts
    │   ├── commands/
    │   │   ├── start.ts
    │   │   ├── status.ts
    │   │   ├── admin.ts
    │   │   └── help.ts
    │   └── handlers/callback.ts
    └── database/
        ├── migrations.sql
        └── seed.sql
```

## Environment

Copy `.env.example` to `.env` and set:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_WEBHOOK_URL=
TELEGRAM_CHANNEL_USERNAME=@SerraleJobs
TELEGRAM_ADMIN_IDS=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SERRALE_WEB_URL=https://serrale.com
PORT=3400
NODE_ENV=development
LOG_LEVEL=info
```

## Supabase Setup

1. Open the Supabase SQL editor for the same project used by Serrale.
2. Run [`src/database/migrations.sql`](/Users/terusew/Downloads/serrale---professional-services-marketplace%20(1)/serrale-telegram/src/database/migrations.sql).
3. Optionally run [`src/database/seed.sql`](/Users/terusew/Downloads/serrale---professional-services-marketplace%20(1)/serrale-telegram/src/database/seed.sql) in local or staging only.

This migration:

- adds `telegram_bot` to registration-source constraints
- adds `profiles.serrale_id` and the sequential Serrale ID generator
- creates `telegram_users`
- creates `telegram_link_tokens`
- creates `telegram_channel_posts`
- creates `telegram_session_state`
- creates `telegram_publishable_jobs_v1`

These are additive changes for the existing Serrale database. They do not replace admin, website, jobs, or profile flows. They extend the current system so Telegram can stay in sync with the same `profiles`, `jobs`, `saved_jobs`, and `registration_intakes` data.

## Local Development

```bash
cd serrale-telegram
npm install
npm run dev
```

Phase 1 local development runs in polling mode by default.

Health endpoint:

- `GET http://localhost:3400/health`

## Production Webhook Mode

Set:

- `NODE_ENV=production`
- `TELEGRAM_WEBHOOK_URL=https://<your-domain>/telegram/webhook/<secret>`
- `TELEGRAM_WEBHOOK_SECRET=<same secret in the path>`

Then deploy and start:

```bash
cd serrale-telegram
npm run build
npm start
```

Webhook endpoint:

- `POST /telegram/webhook/:secret`

## BotFather Setup

1. Create the bot and get the token.
2. Set the bot username in `TELEGRAM_BOT_USERNAME`.
3. Add the bot as an admin of `@SerraleJobs`.
4. Grant the bot permission to post and edit messages in the channel.

## Linking Flow

The web app uses backend endpoints on the main Serrale API:

- `GET /api/telegram/link-status`
- `POST /api/telegram/link-token`
- `POST /api/telegram/unlink`

The web-generated link token opens:

```text
https://t.me/<bot_username>?start=link_<token>
```

The bot consumes the token and binds the Telegram account to the existing `profiles.id`.

If a Telegram-first user already has a lightweight Telegram-created profile, the bot rebinds the Telegram account to the authenticated Serrale web profile and moves Telegram-side saved jobs/intake lineage across.

## Identity Flow

Whether a user comes from the jobs channel or opens the bot directly, phase 1 uses the same private-bot identity check:

1. Telegram ghost record is created on first touch.
2. The bot asks for:
   - full name
   - city
   - role: service provider or client
   - main category
3. Serrale issues a readable `SER-xxxxx` ID.
4. Service providers get a lightweight synced profile plus intake lineage.
5. Clients get a lightweight synced client profile and are handed to the web app for the rest of the hiring flow.

Trust is progressive:

- Level 1 Default: name, city, Telegram account linked
- Level 2 Verified: verification/admin review signals on the Serrale profile
- Level 3 Trusted: completed contract or rating history

## Admin Workflow

- `/listjobs` shows publishable open jobs
- `/postjob <jobId>` posts one job to the channel
- `/closejob <jobId>` closes the job and updates the Telegram post

## Render Deployment

Add a dedicated Node service for `serrale-telegram`:

- build command: `cd serrale-telegram && npm install && npm run build`
- start command: `cd serrale-telegram && npm start`
- set all Telegram and Supabase env vars

This service is separate from the existing Serrale backend and admin processes.
