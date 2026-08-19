# GB International Travel

Pakistan-based travel and flight booking portal.

**Status:** READY FOR STAGING · NOT READY FOR PRODUCTION

Live Travelport, live Safepay, and automatic live ticketing remain blocked in code.

## Getting started (development)

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies: `npm install`
3. Configure PostgreSQL `DATABASE_URL`
4. `npm run db:generate && npm run db:push`
5. `npm run dev` → [http://localhost:3000](http://localhost:3000)

## GitHub + Vercel (normal workflow)

This app is Vercel-ready (`vercel.json`, Prisma generate in `build`/`postinstall`). To use the standard GitHub → Vercel deploy:

1. Install [Git for Windows](https://git-scm.com/download/win) and ensure `git` is on your PATH.
2. In this project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: GB International Travel"
   ```
3. Create an empty GitHub repo, then:
   ```bash
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```
4. In Vercel: **Add New Project** → Import that GitHub repo → Framework: Next.js (auto).
5. Add environment variables from `.env.example` / `docs/VERCEL.md` (never commit `.env`).
6. Push schema to hosted Postgres (`npx prisma db push`) before first traffic.
7. Deploy; open `/api/health/ready`.

Do not commit `.env`, `.env.staging`, or `.env.production` (already gitignored).

## Staging

See **[docs/STAGING.md](docs/STAGING.md)** for the staging profile, cron setup, health check, and smoke tests.

**Vercel:** **[docs/VERCEL.md](docs/VERCEL.md)**

Database migration discipline: **[docs/DATABASE_MIGRATIONS.md](docs/DATABASE_MIGRATIONS.md)**.

```bash
npm run qa:staging
npm run build
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
- Use MOCK/SANDBOX providers on staging only
