# Database migration discipline

## Current state

- Schema source of truth: `prisma/schema.prisma`
- Day-to-day staging/dev sync historically used: `npx prisma db push`
- `prisma/migrations/` currently has **no versioned SQL history** (only placeholders)

This is acceptable for **staging preparation**, but **production** should move to controlled migrations.

## Hard rules

Never run against shared/staging/production data:

- `prisma migrate reset`
- `db push --force-reset`
- Dropping the database / truncating without an explicit backup + written approval

## Staging procedure (safe)

1. Ensure `DATABASE_URL` points at the **staging** database only  
2. `npx prisma generate`  
3. `npx prisma db push` — applies schema without wiping data  
4. Confirm with `GET /api/health/ready` (`postgres.reachable: true`)  
5. Optional: `npm run db:seed` (idempotent demo content)

## Baseline migration plan (for future production)

Do this once on a **copy** of staging, then promote:

1. Take a backup of the database  
2. Confirm schema matches `schema.prisma` (`db push` already applied, no drift)  
3. Create a baseline migration without re-applying DDL:

```bash
mkdir -p prisma/migrations/00000000000000_baseline
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/00000000000000_baseline/migration.sql
npx prisma migrate resolve --applied 00000000000000_baseline
```

4. Verify `npx prisma migrate status` shows baseline applied  
5. Future schema changes: `npx prisma migrate dev --name <change>` (dev) then `npx prisma migrate deploy` (staging/production)

If `migrate diff` / resolve tooling differs by Prisma version, follow the official “baselining” guide for Prisma 6 — still **never** reset.

## Production cutover (later)

1. Separate production `DATABASE_URL`  
2. Restore or provision empty DB + `migrate deploy`  
3. Do **not** use file stores  
4. Keep Travelport/Safepay/ticketing live gates closed until a dedicated live launch  

## Connection pooling

For hosted Postgres (Neon, Supabase, RDS Proxy, PgBouncer), prefer a pooled URL for the app and a direct URL for migrations if the host requires it. Document both names in the host secret store (e.g. `DATABASE_URL`, `DATABASE_URL_UNPOOLED`) without committing values.
