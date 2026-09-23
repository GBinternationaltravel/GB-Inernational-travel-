import fs from "fs";
import path from "path";
const envPath = path.join(process.cwd(), ".env");
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const keys = [
  "WEATHER_PROVIDER",
  "WEATHER_API_KEY",
  "EMAIL_PROVIDER",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "REMINDER_CRON_SECRET",
  "PHASE9B_TEST_EMAIL",
  "DATABASE_URL",
];
for (const k of keys) {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  let v = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  if (!v) {
    console.log(`${k}=MISSING`);
    continue;
  }
  if (/KEY|SECRET|DATABASE_URL/.test(k)) {
    console.log(`${k}=SET(len=${v.length})`);
  } else {
    console.log(`${k}=${v}`);
  }
}
