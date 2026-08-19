/**
 * HTTP + auth + public page QA against local server.
 * Usage: npx tsx --env-file=.env scripts/qa-http-probe.ts
 */
const BASE = process.env.QA_BASE_URL ?? "http://127.0.0.1:3003";

type Row = { name: string; ok: boolean; detail: string };
const rows: Row[] = [];

function pass(name: string, detail: string) {
  rows.push({ name, ok: true, detail });
  console.log(`PASS  ${name} — ${detail}`);
}
function fail(name: string, detail: string) {
  rows.push({ name, ok: false, detail });
  console.error(`FAIL  ${name} — ${detail}`);
}

async function fetchStatus(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: "manual",
    headers: { ...(init?.headers ?? {}) },
  });
  return res;
}

async function main() {
  // Health
  for (const path of ["/api/health", "/api/health/ready"]) {
    try {
      const res = await fetchStatus(path);
      const body = await res.text();
      if (res.status >= 200 && res.status < 500) {
        const hasSecret = /postgres:|AUTH_SECRET|RESEND_API_KEY|SAFEPAY/i.test(body);
        if (hasSecret) fail(`HEALTH_${path}`, "response may expose secrets");
        else pass(`HEALTH_${path}`, `status=${res.status}`);
      } else {
        fail(`HEALTH_${path}`, `status=${res.status}`);
      }
    } catch (e) {
      fail(`HEALTH_${path}`, e instanceof Error ? e.message : String(e));
    }
  }

  // Public pages
  const publicPaths = [
    "/",
    "/flights",
    "/tours",
    "/visa",
    "/travel-updates",
    "/deals",
    "/faq",
    "/flight-status",
    "/login",
    "/register",
    "/robots.txt",
    "/sitemap.xml",
  ];
  for (const path of publicPaths) {
    try {
      const res = await fetchStatus(path);
      if (res.status === 200 || res.status === 307 || res.status === 308) {
        pass(`PAGE_${path}`, `status=${res.status}`);
      } else {
        fail(`PAGE_${path}`, `status=${res.status}`);
      }
    } catch (e) {
      fail(`PAGE_${path}`, e instanceof Error ? e.message : String(e));
    }
  }

  // Admin without session should redirect/unauthorized
  try {
    const res = await fetchStatus("/admin");
    if (res.status === 307 || res.status === 302 || res.status === 303) {
      const loc = res.headers.get("location") ?? "";
      if (loc.includes("/login")) pass("ADMIN_UNAUTH_PAGE", `redirect ${loc.slice(0, 80)}`);
      else pass("ADMIN_UNAUTH_PAGE", `redirect status=${res.status} loc=${loc.slice(0, 60)}`);
    } else if (res.status === 401 || res.status === 403) {
      pass("ADMIN_UNAUTH_PAGE", `status=${res.status}`);
    } else {
      fail("ADMIN_UNAUTH_PAGE", `unexpected status=${res.status}`);
    }
  } catch (e) {
    fail("ADMIN_UNAUTH_PAGE", e instanceof Error ? e.message : String(e));
  }

  // Admin API without session
  const adminApis = [
    "/api/admin/airlines",
    "/api/admin/settings",
    "/api/admin/reports/export?type=bookings",
  ];
  for (const path of adminApis) {
    try {
      const res = await fetchStatus(path, {
        method: path.includes("export") || path.includes("airlines") ? "GET" : "GET",
      });
      // POST create without auth
      const post = await fetchStatus(path.split("?")[0]!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const ok =
        [401, 403, 405, 404].includes(res.status) ||
        [401, 403].includes(post.status);
      if (ok || [401, 403].includes(post.status)) {
        pass(`ADMIN_API_UNAUTH`, `${path} get=${res.status} post=${post.status}`);
      } else {
        fail(`ADMIN_API_UNAUTH`, `${path} get=${res.status} post=${post.status}`);
      }
    } catch (e) {
      fail("ADMIN_API_UNAUTH", `${path}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // SEO artifacts
  try {
    const robots = await (await fetchStatus("/robots.txt")).text();
    if (/sitemap/i.test(robots) || /User-agent/i.test(robots)) {
      pass("SEO_ROBOTS", "robots.txt present");
    } else {
      fail("SEO_ROBOTS", "robots.txt unexpected");
    }
  } catch (e) {
    fail("SEO_ROBOTS", e instanceof Error ? e.message : String(e));
  }

  try {
    const sitemap = await (await fetchStatus("/sitemap.xml")).text();
    const needed = ["/tours", "/visa", "/travel-updates"];
    const missing = needed.filter((p) => !sitemap.includes(p));
    if (missing.length) fail("SEO_SITEMAP", `missing: ${missing.join(",")}`);
    else pass("SEO_SITEMAP", "includes tours/visa/travel-updates");
  } catch (e) {
    fail("SEO_SITEMAP", e instanceof Error ? e.message : String(e));
  }

  // Flight search API smoke (mock)
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 14);
    const date = tomorrow.toISOString().slice(0, 10);
    const res = await fetchStatus(
      `/api/flights/search?origin=KHI&destination=DXB&departureDate=${date}&adults=1&cabinClass=ECONOMY&tripType=ONE_WAY`,
    );
    const text = await res.text();
    if (res.status === 200) {
      const hasSecret = /DATABASE_URL|AUTH_SECRET|password/i.test(text);
      if (hasSecret) fail("FLIGHT_SEARCH", "response may expose secrets");
      else pass("FLIGHT_SEARCH", `status=200 bytes=${text.length}`);
    } else {
      // Some apps use POST
      const post = await fetchStatus("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: "KHI",
          destination: "DXB",
          departureDate: date,
          adults: 1,
          cabinClass: "ECONOMY",
          tripType: "ONE_WAY",
        }),
      });
      const body = await post.text();
      if (post.status === 200) pass("FLIGHT_SEARCH", `POST status=200 bytes=${body.length}`);
      else fail("FLIGHT_SEARCH", `GET=${res.status} POST=${post.status}`);
    }
  } catch (e) {
    fail("FLIGHT_SEARCH", e instanceof Error ? e.message : String(e));
  }

  const failed = rows.filter((r) => !r.ok);
  console.log("\n=== HTTP QA SUMMARY ===");
  console.log(`passed=${rows.filter((r) => r.ok).length} failed=${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
