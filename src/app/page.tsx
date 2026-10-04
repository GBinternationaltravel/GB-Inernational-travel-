import type { Metadata } from "next";
import { HomePage } from "@/features/home/home-page";
import { buildMetadata } from "@/lib/seo/metadata";

/** Homepage title/description reflect the air-ticket focus of the hero (no superlatives). */
export const metadata: Metadata = buildMetadata({
  title: "Domestic & International Air Tickets",
  description:
    "Book domestic and international air tickets at fair, all-inclusive PKR fares. Fly PIA, airblue, AirSial, Fly Jinnah and Emirates, plus Gilgit-Baltistan tours.",
  path: "/",
});

export default function Page() {
  return <HomePage />;
}
