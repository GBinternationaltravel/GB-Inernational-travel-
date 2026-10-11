import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { heroPhotoCredit } from "@/features/home/home-hero-photo";
import { homeDisplayFont } from "@/features/home/home-fonts";
import { cn } from "@/lib/utils";

type Destination = {
  name: string;
  /** What we offer there (honest, no claims). */
  offer: string;
  href: string;
  image: string;
  alt: string;
  credit: { author: string; licence: string; licenceUrl: string; source: string };
};

/**
 * Photos: Wikimedia Commons. Sources and licences are listed on the page (credits line) and in CHANGES.md.
 * Each is cropped to 4:5 and exported to WebP (≤ 110 KB).
 */
const destinations: Destination[] = [
  {
    name: "Skardu",
    offer: "Flights · Tours",
    href: "/tours",
    image: "/images/destinations/skardu.webp",
    alt: "Katpana cold desert near Skardu with snow-capped peaks",
    credit: {
      author: "Abdullah Shakoor",
      licence: "CC0",
      licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      source: "https://commons.wikimedia.org/wiki/File:Skardu_Katpana_Desert.jpg",
    },
  },
  {
    name: "Hunza",
    offer: "Tours",
    href: "/tours",
    image: "/images/destinations/hunza.webp",
    alt: "Hunza Valley with poplar trees and the Hunza River",
    credit: {
      author: "ほっきー",
      licence: "CC0",
      licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      source: "https://commons.wikimedia.org/wiki/File:Hunza_Valley_2024.jpg",
    },
  },
  {
    name: "Gilgit",
    offer: "Flights · Tours",
    href: "/tours",
    image: "/images/destinations/gilgit.webp",
    alt: "Mountains above Gilgit town",
    credit: {
      author: "HuangWending18072009",
      licence: "CC0",
      licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      source: "https://commons.wikimedia.org/wiki/File:Photo_1_taken_in_Gilgit_in_2024.jpg",
    },
  },
  {
    name: "Dubai",
    offer: "Flights · Visas",
    href: "/destinations/united-arab-emirates/dubai",
    image: "/images/destinations/dubai.webp",
    alt: "Sunset over the desert dunes outside Dubai",
    credit: {
      author: "Ankur Panchbudhe",
      licence: "CC BY 2.0",
      licenceUrl: "https://creativecommons.org/licenses/by/2.0/",
      source: "https://commons.wikimedia.org/wiki/File:Sunset_in_Dubai_Desert.jpg",
    },
  },
  {
    name: "Jeddah",
    offer: "Flights for Umrah",
    href: "/destinations/saudi-arabia/jeddah",
    image: "/images/destinations/jeddah.webp",
    alt: "Minaret of the historic al-Mimar Mosque in old Jeddah",
    credit: {
      author: "Richard Mortel",
      licence: "CC BY 2.0",
      licenceUrl: "https://creativecommons.org/licenses/by/2.0/",
      source:
        "https://commons.wikimedia.org/wiki/File:Al-Mimar_Mosque,_1824-25,_old_Jeddah,_Saudi_Arabia_(1)_(50703575237).jpg",
    },
  },
];

export function HomeSignatureDestinations() {
  return (
    <section aria-labelledby="signature-destinations-title" className="bg-[#0a1a31] text-white">
      <Container className="py-20 sm:py-24">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-3 text-[0.625rem] font-semibold tracking-[0.3em] text-[#d9c08f] uppercase">
              <span className="h-px w-8 bg-[#c9a96e]" aria-hidden />
              Signature destinations
            </p>
            <h2
              id="signature-destinations-title"
              className={cn(
                homeDisplayFont.className,
                "mt-4 max-w-xl text-[2.25rem] leading-[1.08] font-medium tracking-[-0.01em] text-white sm:text-[2.75rem]",
              )}
            >
              From the high valleys of the North to the Gulf
            </h2>
          </div>
          <Link
            href="/destinations"
            className="inline-flex items-center gap-2 self-start text-sm text-white/80 underline decoration-[#c9a96e]/70 decoration-1 underline-offset-[6px] transition-colors hover:text-white sm:self-auto"
          >
            All destinations
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </Link>
        </div>

        <ul className="-mx-4 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5 lg:gap-5 [&::-webkit-scrollbar]:hidden">
          {destinations.map((destination) => (
            <li key={destination.name} className="w-[68vw] max-w-[17rem] shrink-0 snap-start sm:w-auto sm:max-w-none">
              <Link
                href={destination.href}
                className="group relative block aspect-[4/5] overflow-hidden rounded-[18px] bg-[#13284a] ring-1 ring-white/10 focus-visible:outline-offset-4"
              >
                <Image
                  src={destination.image}
                  alt={destination.alt}
                  fill
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 68vw"
                  quality={70}
                  className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05] motion-reduce:transition-none"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(180deg,rgb(5_14_30/0)_40%,rgb(5_14_30/0.82)_100%)]"
                />
                <span className="absolute inset-x-0 bottom-0 p-5">
                  <span className="block text-[0.5625rem] font-semibold tracking-[0.26em] text-[#e3cc9f] uppercase">
                    {destination.offer}
                  </span>
                  <span
                    className={cn(
                      homeDisplayFont.className,
                      "mt-1.5 flex items-center justify-between text-[1.75rem] leading-none font-medium text-white",
                    )}
                  >
                    {destination.name}
                    <ArrowUpRight
                      className="h-4 w-4 text-white/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[0.6875rem] leading-relaxed text-white/45">
          Photos via Wikimedia Commons.{" "}
          {destinations
            .filter((destination) => destination.credit.licence !== "CC0")
            .map((destination) => (
              <span key={destination.name}>
                {destination.name}:{" "}
                <a
                  href={destination.credit.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-white/20 underline-offset-2 hover:text-white/75"
                >
                  {destination.credit.author}
                </a>
                ,{" "}
                <a
                  href={destination.credit.licenceUrl}
                  target="_blank"
                  rel="noopener noreferrer license"
                  className="underline decoration-white/20 underline-offset-2 hover:text-white/75"
                >
                  {destination.credit.licence}
                </a>
                .{" "}
              </span>
            ))}
          Skardu, Hunza, Gilgit: CC0. Hero: &ldquo;Flying through the sunrise&rdquo; by{" "}
          <a
            href={heroPhotoCredit.source}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-white/20 underline-offset-2 hover:text-white/75"
          >
            {heroPhotoCredit.author}
          </a>
          ,{" "}
          <a
            href={heroPhotoCredit.licenceUrl}
            target="_blank"
            rel="noopener noreferrer license"
            className="underline decoration-white/20 underline-offset-2 hover:text-white/75"
          >
            {heroPhotoCredit.licence}
          </a>
          {" "}(cropped, sky extended and colour-graded).
        </p>
      </Container>
    </section>
  );
}
