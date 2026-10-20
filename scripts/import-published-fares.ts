/**
 * Bulk-update published inventory fares from a CSV, then bump Flight.updatedAt.
 *
 * Staff can also edit one flight at a time in Admin → Flights. That screen already
 * saves the fare and updates Flight.updatedAt. This script is for a spreadsheet.
 *
 * CSV header (required): flightId,fare
 * Example:
 *   flightId,fare
 *   clxxxxxxxx,18020
 *
 * Usage (from the repo root, with DATABASE_URL set):
 *   npx tsx scripts/import-published-fares.ts ./fares.csv
 *
 * The script does not publish a live airline fare. After it runs, refresh the site:
 *   curl -X POST "$APP_URL/api/internal/revalidate" \
 *     -H "Authorization: Bearer $REVALIDATE_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"paths":["/","/flights"]}'
 *
 * Do not commit the CSV. It is not a public endpoint.
 */
import { readFileSync } from "fs";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/db";
import {
  inventoryMetaKey,
  parseInventoryMeta,
} from "../src/providers/flights/inventory-flight-supplier";

function parseCsv(text: string): Array<{ flightId: string; fare: number }> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const header = lines.shift()?.toLowerCase();
  if (header !== "flightid,fare") {
    throw new Error("CSV header must be flightId,fare");
  }
  return lines.map((line, index) => {
    const [flightId, fareRaw] = line.split(",").map((part) => part.trim());
    const fare = Number(fareRaw);
    if (!flightId || !Number.isFinite(fare) || fare < 0) {
      throw new Error(`Bad row ${index + 2}`);
    }
    return { flightId, fare: Math.round(fare) };
  });
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error("Pass a CSV path. See the comment at the top of this file.");
  }
  const rows = parseCsv(readFileSync(file, "utf8"));
  let updated = 0;
  for (const row of rows) {
    const key = inventoryMetaKey(row.flightId);
    const setting = await prisma.siteSetting.findUnique({ where: { key } });
    const meta = parseInventoryMeta(setting?.value);
    if (!setting || !meta) {
      console.error(`Skipped ${row.flightId}: no published fare record`);
      continue;
    }
    const next = { ...meta, fare: row.fare };
    await prisma.$transaction([
      prisma.siteSetting.update({
        where: { key },
        data: { value: next as unknown as Prisma.InputJsonValue },
      }),
      prisma.flight.update({
        where: { id: row.flightId },
        data: { providerCode: "INVENTORY" },
      }),
    ]);
    updated += 1;
    console.log(`Updated ${row.flightId} fare to ${row.fare}`);
  }
  console.log(`Done. ${updated} fare(s) updated. Flight.updatedAt was refreshed for those rows.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Import failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
