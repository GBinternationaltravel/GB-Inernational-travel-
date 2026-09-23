# GB International Travel

Pakistan-based travel and flight booking portal.

**Official production URL:** https://www.gbinternationaltravels.com/

**GitHub:** https://github.com/GBinternationaltravel/GB-Inernational-travel-

Live Travelport, live Safepay, and automatic live ticketing remain blocked in code. Production may still use MOCK/SANDBOX providers until a separate live-provider cutover.

## Getting started (development)

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies: `npm install`
3. Configure local PostgreSQL `DATABASE_URL`
4. `npm run db:generate && npm run db:push`
5. `npm run dev` → [http://localhost:3000](http://localhost:3000)

## GitHub + Vercel

This app deploys through:

**local project → GitHub `main` → one Vercel project → https://www.gbinternationaltravels.com/**

- Repository: `GBinternationaltravel/GB-Inernational-travel-`
- Production branch: `main`
- Build: `prisma generate && next build`
- Configure Vercel in the **web dashboard only** (no CLI login from this workspace)
- Environment variables: `.env.example` and [docs/VERCEL.md](docs/VERCEL.md)
- Hosted PostgreSQL is required on Vercel. Do not use local `localhost` as the production database.

Do not commit `.env`, `.env.staging`, or `.env.production` (already gitignored).

## Staging

See **[docs/STAGING.md](docs/STAGING.md)** for the optional staging profile.

**Vercel / production:** **[docs/VERCEL.md](docs/VERCEL.md)**

Database migration discipline: **[docs/DATABASE_MIGRATIONS.md](docs/DATABASE_MIGRATIONS.md)**.

```bash
npm run build
npm run lint
```

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma
- NextAuth
- Zod

## Safety

- Never commit `.env` secrets
- Never run `prisma migrate reset` on shared databases
- Do not convert MOCK/SANDBOX providers to live APIs without a dedicated cutover
