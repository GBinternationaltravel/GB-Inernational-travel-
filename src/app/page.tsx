import type { Metadata } from "next";
import { HomePage } from "@/features/home/home-page";
import { buildMetadata } from "@/lib/seo/metadata";

/** Homepage title/description reflect the air-ticket focus of the hero (no superlatives). */
export const metadata: Metadata = buildMetadata({
  title: "Domestic & International Air Tickets",
  description:
    "Search domestic and international air tickets from Pakistan. Published PKR fares from GB International Travel; our team confirms availability and issues tickets.",
  path: "/",
});

export default function Page() {
  return <HomePage />;
}
