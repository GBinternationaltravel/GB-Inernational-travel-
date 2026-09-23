# Staging deployment guide

The official **production** domain is **https://www.gbinternationaltravels.com/**.
Do not point staging at that domain. Use a separate host, database, and secrets.

This guide is for an optional staging profile only.

Safety gates that must remain closed:

- Live Travelport production APIs
- Live Safepay charging
- Automatic live airline ticketing

## Goals

Staging proves the full booking + admin ticket workflow with:

| Concern | Staging mode |
|---------|----------------|
| Database | PostgreSQL + Prisma stores only |
| Flights | `mock` or Travelport **sandbox** |
| Payments | `MOCK` or Safepay **sandbox** |
| Email | `console` or Resend |
| Weather | `mock` (or OpenWeather with key) |
| Flight status | `mock` (or AviationStack with key) |
| Ticketing | **MANUAL** in Admin Settings |

Do not charge real customer cards. Do not issue invented live airline tickets.

## Vercel

For the official production Vercel project, GitHub repo, and domain, see **[docs/VERCEL.md](./VERCEL.md)**.

## Environment

Set on the staging host (secrets via host vault — never commit):

```bash
APP_ENV=staging
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://staging.your-domain.example
DATABASE_URL=postgresql://...staging-db...
BOOKING_STORE=prisma
AUTH_STORE=prisma
NOTIFICATION_STORE=prisma
PAYMENT_STORE=prisma
SESSION_SECRET=<staging-only>
AUTH_SECRET=<staging-only>
REMINDER_CRON_SECRET=<staging-only>
FLIGHT_SUPPLIER=mock
PAYMENT_PROVIDER=MOCK
ALLOW_MOCK_PAYMENTS=true
EMAIL_PROVIDER=console
WEATHER_PROVIDER=mock
FLIGHT_STATUS_PROVIDER=mock
```

Use a **separate** database and secrets from production.

HTTPS is required for staging cookies (`secure` when `NODE_ENV=production`).

See `.env.example` for the full variable catalog.

## Database (non-destructive)

```bash
npx prisma generate
npx prisma db push
# optional idempotent demo data:
npm run db:seed
```

**Forbidden:** `prisma migrate reset`, `db push --force-reset`, dropping the database.

Migration strategy for future production: `docs/DATABASE_MIGRATIONS.md`.

## Reminder cron

Endpoint: `POST /api/internal/reminders/run`  
Auth: `Authorization: Bearer <REMINDER_CRON_SECRET>`  
Optional dry run: `?dryRun=1`

Example (secret never printed in logs/CI output):

```bash
curl -sS -X POST "$NEXT_PUBLIC_APP_URL/api/internal/reminders/run?dryRun=1" \
  -H "Authorization: Bearer $REMINDER_CRON_SECRET"
```

Schedule every 15–30 minutes from your host cron / Cloud Scheduler / GitHub Actions.

## Health check

```bash
curl -sS "$NEXT_PUBLIC_APP_URL/api/health/ready"
```

Expect `status: "ready"`, `appEnv: "staging"`, all stores `prisma`, and `safetyGates` showing live Travelport / live Safepay / live ticketing blocked. The JSON never includes secret values.

## Smoke test (manual)

Customer:

1. Search flight → select → passengers → review → payment → confirmation → My Trips  
2. Confirm supplier fare + GB markup + customer total match payment amount  

Admin:

1. Login → booking detail → verify payment → **Issue Ticket** (confirm modal) → audit log  

## Deploy order

1. Provision staging Postgres + backup policy  
2. Set staging secrets (`APP_ENV=staging`, prisma stores, cron secret, mock/sandbox providers)  
3. `npm ci` → `npx prisma generate` → `npx prisma db push`  
4. `npm run build` → `npm start` (or platform equivalent)  
5. Hit `/api/health/ready`  
6. Seed staff users if needed  
7. Configure reminder cron  
8. Run smoke tests above  
9. Run `npm run qa:staging` locally/CI against staging env when available  

## Production blockers (do not remove)

1. Travelport production forced off in code  
2. Safepay live charging not enabled  
3. Automatic live ticketing disabled; LIVE issuer rejected  
4. Live credentials / commercial contracts still required for real launch  
