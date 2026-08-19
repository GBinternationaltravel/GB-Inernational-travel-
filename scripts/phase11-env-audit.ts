import { readFileSync } from "node:fs";

const envText = readFileSync(".env", "utf8");
const map = new Map<string, string>();
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (!m?.[1]) continue;
  const key = m[1];
  const value = (m[2] ?? "").trim().replace(/^"|"$/g, "");
  map.set(key, value);
}

const db = map.get("DATABASE_URL") || "";
try {
  const u = new URL(db);
  console.log(
    JSON.stringify({
      dbHost: u.hostname,
      dbPort: u.port || "5432",
      dbName: u.pathname,
      dbUserSet: Boolean(u.username),
    }),
  );
} catch {
  console.log(JSON.stringify({ dbParse: "fail" }));
}

const keys = [
  "WEATHER_API_KEY",
  "WEATHER_PROVIDER",
  "RESEND_API_KEY",
  "EMAIL_PROVIDER",
  "EMAIL_FROM",
  "FLIGHT_STATUS_API_KEY",
  "FLIGHT_STATUS_PROVIDER",
  "BOOKING_STORE",
  "AUTH_STORE",
  "NOTIFICATION_STORE",
  "TRAVELPORT_ENVIRONMENT",
  "TRAVELPORT_ENABLE_SANDBOX_TICKETING",
  "TRAVELPORT_ENABLE_SANDBOX_BOOKING",
  "FLIGHT_SUPPLIER",
  "PAYMENT_PROVIDER",
  "PHASE9B_TEST_EMAIL",
  "REMINDER_CRON_SECRET",
  "ALLOW_OPTIONAL_EMAILS_WITHOUT_OPT_IN",
];
for (const k of keys) {
  const v = map.get(k);
  if (v === undefined) console.log(`${k}=MISSING`);
  else if (!v) console.log(`${k}=EMPTY`);
  else console.log(`${k}=SET len=${v.length}`);
}
