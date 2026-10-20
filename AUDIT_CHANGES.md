# Audit changes

Groups 1–3 shipped in pull request #1 and are on `main`. Groups 4–9 are on `audit-improvements-2`. This file covers both, with file-level detail for groups 4–9.

Nothing on the site is a live airline fare, an instant confirmation, or a card payment.

## Group 4 — fares, flight status, travel notes

- Admin → Flights still edits published fares. Saving, updating, or activating a flight refreshes `Flight.updatedAt` and calls `revalidatePath` for `/` and the flights pages.
- `POST /api/internal/revalidate` with `Authorization: Bearer $REVALIDATE_SECRET` refreshes those pages on demand. Allowed paths are `/`, `/flights`, `/flights/domestic`, `/flights/international`, `/travel-updates`, `/flight-status`.
- `scripts/import-published-fares.ts` updates fares from a CSV (`flightId,fare`). It is a local script, not a public page. Run `npx tsx scripts/import-published-fares.ts ./fares.csv` with `DATABASE_URL` set, then call the revalidate route.
- `/` and `/flights` already revalidate every hour.
- `/flight-status` uses `FLIGHT_STATUS_PROVIDER=aviationstack` or `aerodatabox` only when `FLIGHT_STATUS_API_KEY` is set. Lookups are cached for 90 seconds. If the provider is missing, the page says live status is not connected and does not invent gates, delays, or times.
- Travel notes live in `content/travel-updates/*.md` (Flights, Roads, Weather, Umrah, Visas) with a date, a source, and `review: TODO: verify`. They merge with the existing CMS list. RSS is `/travel-updates/rss.xml`. Article and breadcrumb JSON-LD are on each note. The homepage shows the three latest non-sample notes.
- These sample CMS pages stay at the same addresses and are `noindex`: `kkh-seasonal-advisory`, `gilgit-weather-update-sample`, `skardu-flight-ops-sample`. They are left out of the sitemap.

## Group 5 — trust, company facts, callback, FAQs

- Trust strip: Real people on WhatsApp, Clear PKR fares, Manual verification before ticketing, and the reply-time placeholder.
- About shows legal name, office address, licence, accreditation, and a reviews line only when those env values are non-empty.
- Contact has an “Ask for a call” form (name, phone, optional message, honeypot, 5 requests / 15 minutes / IP). It emails the booking inbox and is not a booking.
- The Urdu/Arabic homepage FAQ is removed. Buyer FAQs cover requests, PKR fares, card payment, e-tickets, changes, and currency.
- Refund and cancellation pages open with a line that the wording is suggested for the owner to confirm. The older day counts and fee sentences are still in the body and are not newly verified.

## Group 6 — performance

- Hero image is the only eager, high-priority image. Destination cards use `next/image` with `sizes`, quality 65, lazy loading, and low fetch priority.
- Brand font (Playfair) is `next/font` with `preload: false` so it does not compete with the hero. Homepage display font stays self-hosted with `display: swap`.
- Chat widget was already loaded with `next/dynamic` and `ssr: false`.
- No bundle analyzer package was added.

Production build, homepage JavaScript:

| | Route JS | First Load JS | Shared |
| --- | --- | --- | --- |
| After group 3 (`main`) | 12 kB | 160 kB | 103 kB |
| After groups 4–9 | 12.1 kB | 161 kB | 103 kB |

Lighthouse was not run in this environment (no Chrome run against a deployed URL). Re-run Lighthouse on the preview for mobile and desktop before calling the performance work finished.

## Group 7 — SEO

- TravelAgency JSON-LD includes the public phone and email, and an address only when `NEXT_PUBLIC_OFFICE_ADDRESS` is set.
- Homepage adds FAQPage and BreadcrumbList JSON-LD. Route guides and travel notes add BreadcrumbList. Travel notes add Article JSON-LD. `/faq` already had FAQPage.
- No `hreflang`. There is no Urdu or Arabic translation.
- Sitemap uses each note’s date as `lastmod` when the note has one. Login, my-trips, results query URLs, and the three sample notes are not listed. `robots.ts` still disallows `/login`, `/my-trips`, `/flights/results`, `/booking/`, `/admin`, and `/api/`.
- New route guides (existing URLs were not renamed):
  - `/flights/islamabad-skardu`
  - `/flights/islamabad-gilgit`
  - `/flights/skardu-islamabad`
  - `/flights/gilgit-islamabad`
  - `/flights/islamabad-dubai`
  - `/flights/lahore-jeddah`
- Each has its own title, description, H1, and canonical. They do not state a price or a flight time.

### Search Console checklist

1. Confirm `NEXT_PUBLIC_APP_URL` is the live https host (one of www or non-www).
2. Submit `https://<host>/sitemap.xml`.
3. Inspect `/`, `/flights`, one route guide, and one travel note. Confirm the canonical matches the host.
4. Confirm `/login`, `/my-trips`, and `/flights/results?...` are excluded.
5. Confirm the three sample travel-update URLs are “Excluded by noindex”.
6. Do not add hreflang until a real translation exists.

## Group 8 — accessibility

- Closed mobile navigation is not rendered, so its links are not focusable.
- Menu button and mobile nav rows use at least 44px height. Header links have a visible focus outline.
- The short mobile WhatsApp and Call links have an accessible name that includes the full label and number. The desktop links show that text, so they do not repeat it in a second label.

## Group 9 — reliability

- `src/app/not-found.tsx`, `src/app/error.tsx`, and `src/app/global-error.tsx`.
- `src/middleware.ts` sends one 301 to the https origin in `NEXT_PUBLIC_APP_URL`. Localhost is unchanged.
- Security headers: CSP, `nosniff`, referrer policy, `X-Frame-Options`, permissions policy, HSTS. CSP allows inline scripts because JSON-LD and Next.js need them. A nonce-based CSP would be stricter and was not added.
- `@vercel/analytics` and `@vercel/speed-insights` are loaded in the root layout. They are the two new dependencies. They are small and were requested for Vercel measurement.
- `logServerFailure` strips emails and phone-like strings before `console.error`.
- Vercel Hobby is for non-commercial use. A public travel business needs Pro. Billing was not changed.

## Files touched in groups 4–9

- `.env.example` — new placeholders and provider notes
- `package.json`, `package-lock.json` — Analytics and Speed Insights
- `next.config.ts` — security headers
- `src/middleware.ts` — canonical redirect
- `src/app/layout.tsx` — font preload, analytics
- `src/app/not-found.tsx`, `error.tsx`, `global-error.tsx`
- `src/app/about/page.tsx`, `contact/page.tsx`, `refund-policy/page.tsx`, `cancellation-policy/page.tsx`
- `src/app/sitemap.ts`, `src/app/flights/[route]/page.tsx`, `src/data/flight-routes.ts`
- `src/app/flight-status/page.tsx`, `src/config/flight-status.ts`, `src/services/flight-status-service.ts`
- `src/providers/flight-status/aerodatabox-flight-status-provider.ts`, `src/providers/registry.ts`
- `src/app/travel-updates/page.tsx`, `[slug]/page.tsx`, `rss.xml/route.ts`
- `content/travel-updates/*.md`, `src/lib/travel-updates/*`
- `src/app/api/internal/revalidate/route.ts`, `src/app/api/callback-requests/route.ts`
- `src/lib/cache/revalidate-public-fares.ts`, `src/services/flight-inventory-service.ts`
- `scripts/import-published-fares.ts`
- `src/features/home/home-page.tsx`, `home-hero.tsx`, `home-popular-routes.tsx`, `home-signature-destinations.tsx`
- `src/components/layout/site-header.tsx`
- `src/config/site.ts`, `src/data/mock/content.ts`, `src/lib/seo/metadata.ts`
- `src/lib/logging/server-failure.ts`, `src/lib/booking/submit-booking-request.ts`
- `src/features/contact/callback-form.tsx`, `src/lib/validations/callback-request.ts`

## Placeholders and env vars

Leave these blank until the owner publishes a real value. Do not invent them.

| Env | Meaning | Current fallback |
| --- | --- | --- |
| `BOOKING_REQUEST_EMAIL` | Inbox for booking requests and callback requests | `gb.intltravel@gmail.com` |
| `NEXT_PUBLIC_CONTACT_WHATSAPP_PK` | Pakistan WhatsApp | hidden |
| `NEXT_PUBLIC_RESPONSE_TIME` | Trust-strip reply time | hidden when blank |
| `NEXT_PUBLIC_LEGAL_NAME` | Legal name on About | hidden |
| `NEXT_PUBLIC_OFFICE_ADDRESS` | Office address on About and in JSON-LD | hidden |
| `NEXT_PUBLIC_LICENCE` | Licence line on About | hidden |
| `NEXT_PUBLIC_ACCREDITATION` | Accreditation line on About | hidden |
| `NEXT_PUBLIC_REVIEWS_SUMMARY` | Reviews line on About | hidden |
| `REVALIDATE_SECRET` | On-demand page refresh | route returns 401 |
| `FLIGHT_STATUS_PROVIDER` | `mock`, `aviationstack`, or `aerodatabox` | `mock` (no invented public status) |
| `FLIGHT_STATUS_API_KEY` | Provider key, server only | empty |
| `FLIGHT_STATUS_BASE_URL` | Override provider host | AviationStack or AeroDataBox default |
| `FLIGHT_STATUS_RAPIDAPI_HOST` | AeroDataBox host header | `aerodatabox.p.rapidapi.com` |
| `NEXT_PUBLIC_APP_URL` | Canonical https host for the 301 | existing app URL |

Also still for the owner, not env vars:

- Which airlines are actually sold on each route. Pages may name PIA, airblue, AirSial, Fly Jinnah, and Emirates as the set the site is built for, and they say to verify the route.
- Seasonal and road wording on Gilgit, Skardu, and Hunza, and in the five travel notes (`TODO: verify`).
- Refund and cancellation day counts and the non-refundable service-charge sentence.

## Mobile and desktop checklist

- 360×740: hero title is the short line, search card is on the first screen, WhatsApp and Call are tappable, closed menu is not focusable, open menu rows are at least 44px.
- Desktop: one H1 with the longer fare sentence, route-guide links under popular routes, travel notes, About hides empty company facts.
- `/flight-status` with no API key shows the not-connected message and no delay.
- `/travel-updates/northern-flights` shows the date, source, and TODO: verify warning.
- `/flights/islamabad-skardu` and `/flights/lahore-jeddah` read as different pages and link to search plus WhatsApp.
- `/travel-updates/kkh-seasonal-advisory` (with a database) stays reachable and noindex.
- Callback form rejects a short phone number and accepts a valid one without taking payment.

## Blocked

- Live AviationStack and AeroDataBox calls were not made (no API key).
- Lighthouse before/after on the deployed site was not run.
- A nonce CSP was not added.
- Billing and the Vercel plan were not changed.

## Next steps

1. Set `REVALIDATE_SECRET`, `NEXT_PUBLIC_APP_URL`, and the flight-status provider on Vercel when a key exists.
2. Fill the placeholder env vars only with owner-supplied facts.
3. Replace or unpublish the five `TODO: verify` notes after the owner checks them.
4. Confirm the refund and cancellation sentences, then remove the “suggested wording” line.
5. Run Lighthouse on the preview (mobile and desktop) and Search Console URL inspection.
6. Move the project to Vercel Pro before treating the deployment as a commercial site.
