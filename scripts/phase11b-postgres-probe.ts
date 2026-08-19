/**
 * Phase 11B PostgreSQL connectivity probe — no secrets printed.
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const url = process.env.DATABASE_URL || "";
  let host = "unknown";
  let port = "unknown";
  try {
    const u = new URL(url);
    host = u.hostname;
    port = u.port || "5432";
  } catch {
    console.log(JSON.stringify({ ok: false, error: "DATABASE_URL_PARSE_FAIL" }));
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    console.log(
      JSON.stringify({
        ok: true,
        host,
        port,
        latencyMs: Date.now() - started,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 220) : "POSTGRES_FAIL";
    console.log(
      JSON.stringify({
        ok: false,
        host,
        port,
        error: message.replace(/:[^:@/]+@/g, ":***@"),
      }),
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
