# Vercel staging deployment

GB International Travel is prepared for **Vercel staging** only.
Live Travelport, live Safepay, and automatic live ticketing remain blocked.

## Project settings (Vercel)

| Setting | Value |
|---------|--------|
| Framework | Next.js (auto-detected) |
| Build Command | `prisma generate && next build` (from `package.json`) |
| Install Command | `npm install` (runs `postinstall` → `prisma generate`) |
| Output | Next.js default |
| Node | 20.x recommended |

## Staging provider profile (required)

Set these on the Vercel project (Environment = Production *or* a Staging/Preview env — keep MOCK):

```
APP_ENV=staging
FLIGHT_SUPPLIER=mock
PAYMENT_PROVIDER=MOCK
ALLOW_MOCK_PAYMENTS=true
EMAIL_PROVIDER=console
WEATHER_PROVIDER=mock
FLIGHT_STATUS_PROVIDER=mock
BOOKING_STORE=prisma
AUTH_STORE=prisma
NOTIFICATION_STORE=prisma
PAYMENT_STORE=prisma
```

Admin → Settings → ticket issuer mode = **MANUAL**.

Do **not** set live Travelport / Safepay production credentials.

## Server environment variable names

- `APP_ENV`
- `DATABASE_URL`
- `BOOKING_STORE`
- `AUTH_STORE`
- `NOTIFICATION_STORE`
- `PAYMENT_STORE`
- `AUTH_SECRET`
- `SESSION_SECRET`
- `REMINDER_CRON_SECRET`
- `CRON_SECRET` *(Vercel Cron Bearer; set the same strong random value Vercel will send)*
- `ALLOW_MOCK_PAYMENTS`
- `FLIGHT_SUPPLIER`
- `PAYMENT_PROVIDER`
- `EMAIL_PROVIDER`
- `WEATHER_PROVIDER`
- `FLIGHT_STATUS_PROVIDER`
- `BOOKING_DRAFT_EXPIRY_MINUTES`

Optional later (sandbox only — leave empty for MOCK staging):

- `TRAVELPORT_*`, `SAFEPAY_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `WEATHER_API_KEY`, `FLIGHT_STATUS_API_KEY`

## Public variable names

- `NEXT_PUBLIC_APP_URL` → your Vercel HTTPS URL (e.g. `https://your-app.vercel.app`)
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_DEFAULT_CURRENCY`
- `NEXT_PUBLIC_DEFAULT_LOCALE`

## Database (before first deploy)

1. Provision hosted PostgreSQL (Neon, Supabase, Vercel Postgres, RDS, etc.).
2. Prefer a **pooled** connection string for serverless (`DATABASE_URL`).
3. From a trusted machine (not required on Vercel build):

```bash
npx prisma generate
npx prisma db push
# optional:
npm run db:seed
```

Never run `prisma migrate reset` against shared data.

Vercel build generates the Prisma Client; it does **not** push schema. Schema must already exist on the staging DB.

## Cron (reminders)

`vercel.json` schedules:

`GET /api/internal/reminders/run` every 15 minutes.

Auth:

1. Set `CRON_SECRET` in Vercel (platform injects `Authorization: Bearer <CRON_SECRET>` on Cron invocations).
2. Also set `REMINDER_CRON_SECRET` (can match `CRON_SECRET`) for manual/external POST callers.

Hobby plan cron frequency may be limited by Vercel — check your plan. External schedulers may still `POST` with Bearer `REMINDER_CRON_SECRET`.

## Auth on Vercel

- NextAuth `trustHost: true` is enabled.
- Set `AUTH_SECRET` and `NEXT_PUBLIC_APP_URL` to the HTTPS deployment URL.
- JWT sessions work on serverless.

## Filesystem

Local `.data/*.json` file stores do **not** persist on Vercel. Staging must use Prisma + PostgreSQL only.

## Deploy checklist

1. Create Vercel project linked to this repo  
2. Add env vars (names above) — secrets via Vercel dashboard only  
3. Push schema to staging Postgres (`db push`)  
4. Deploy  
5. Open `/api/health/ready`  
6. Smoke: mock search → book → mock pay → MANUAL ticket  
7. Confirm Cron invocations in Vercel dashboard  

See also: `docs/STAGING.md`, `docs/DATABASE_MIGRATIONS.md`.
