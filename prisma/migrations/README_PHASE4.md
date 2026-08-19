-- Phase 4 auth & profile fields migration (PostgreSQL)
-- Apply with: npx prisma migrate dev --name phase4_auth_my_trips
-- Or use: npx prisma db push
-- Do NOT run prisma migrate reset unless explicitly instructed.

-- Roles
-- ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STAFF';
-- ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AGENT';

-- User profile fields and Auth.js tables are defined in prisma/schema.prisma
-- Prefer Prisma Migrate / db push rather than hand-editing production.
