# Vercel production deployment

Official production URL: **https://www.gbinternationaltravels.com/**

Connect **one** Vercel project to this GitHub repository. Do not create duplicate projects.

| Setting | Value |
|---------|--------|
| GitHub repository | `GBinternationaltravel/GB-Inernational-travel-` |
| Production branch | `main` |
| Framework | Next.js (auto-detected) |
| Build Command | `prisma generate && next build` (from `package.json`) |
| Install Command | `npm install` (runs `postinstall` → `prisma generate`) |
| Node.js | **20.x** |
| Canonical URL | `https://www.gbinternationaltravels.com` |

Live Travelport, live Safepay, and automatic live ticketing remain blocked in code.

Do **not** use the Vercel CLI from this workspace. Configure Vercel in the web dashboard only.

## Dashboard connection (manual)

If a Vercel project already owns `gbinternationaltravels.com` / `www.gbinternationaltravels.com`:

1. Open that **existing** project.
2. **Settings → Git** → connect `GBinternationaltravel/GB-Inernational-travel-`.
3. Production branch: `main`.
4. **Settings → Domains** → keep only the official domain. Do not delete DNS/email records from the domain registrar.

If **no** project owns the domain:

1. **Add New Project** → Import `GBinternationaltravel/GB-Inernational-travel-`.
2. Framework: Next.js. Node.js: 20.x.
3. Add environment variables (below) **before** the first production deploy.
4. After the first successful deploy, **Settings → Domains** → add `www.gbinternationaltravels.com` and `gbinternationaltravels.com`.
5. Do **not** create a second project later.

The public site currently returns Vercel `DEPLOYMENT_NOT_FOUND`. DNS already points at Vercel. A successful production deploy on the project that owns the domain is required.

## Production environment variables

Set on Vercel **Production**. Preview/Development should not use the official domain as canonical.

Required:

```
APP_ENV=production
NEXT_PUBLIC_APP_URL=https://www.gbinternationaltravels.com
NEXT_PUBLIC_APP_NAME=GB International Travel
NEXT_PUBLIC_DEFAULT_CURRENCY=PKR
NEXT_PUBLIC_DEFAULT_LOCALE=en
DATABASE_URL=<hosted PostgreSQL — not localhost>
BOOKING_STORE=prisma
AUTH_STORE=prisma
NOTIFICATION_STORE=prisma
PAYMENT_STORE=prisma
AUTH_SECRET=<new production secret>
SESSION_SECRET=<new production secret>
REMINDER_CRON_SECRET=<new production secret>
CRON_SECRET=<same value Vercel Cron will send>
ALLOW_MOCK_PAYMENTS=true
FLIGHT_SUPPLIER=mock
PAYMENT_PROVIDER=MOCK
EMAIL_PROVIDER=console
WEATHER_PROVIDER=mock
FLIGHT_STATUS_PROVIDER=mock
```

Do not invent API keys. Leave Travelport / Safepay / Resend empty until real credentials exist.

Local `.env` values must **not** be committed. Copy names from `.env.example`. Generate new secrets for production; do not reuse local/dev secrets.

## Database

Vercel cannot use the local PostgreSQL database.

1. Provision hosted PostgreSQL (Vercel Postgres, Neon, or similar).
2. Put the **pooled** connection string in `DATABASE_URL` (Production).
3. From a trusted machine, after the hosted URL exists:

```bash
npx prisma generate
npx prisma db push
```

Never run `prisma migrate reset` or `db push --force-reset`.

The Vercel build generates Prisma Client only. It does not push schema.

## Cron (reminders)

`vercel.json` schedules one job:

`GET /api/internal/reminders/run` every 15 minutes.

1. Set `CRON_SECRET` in Vercel (platform sends `Authorization: Bearer <CRON_SECRET>`).
2. Set `REMINDER_CRON_SECRET` (may match `CRON_SECRET`) for manual POST callers.

Hobby-plan cron frequency may be limited. Do not add a second cron job.

## Auth

- NextAuth `trustHost: true` is enabled.
- Set `AUTH_SECRET`.
- Set `NEXT_PUBLIC_APP_URL=https://www.gbinternationaltravels.com`.

## Filesystem

Local `.data/*.json` file stores do not persist on Vercel. Production must use Prisma + hosted PostgreSQL.

See also: `docs/STAGING.md`, `docs/DATABASE_MIGRATIONS.md`.
