import Link from "next/link";
import { getImageProps } from "next/image";
import { preload } from "react-dom";
import {
  ArrowRight,
  BellRing,
  Compass,
  MessageCircle,
  Phone,
  Plane,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { HomeHeroSearch } from "@/features/home/home-hero-search";
import { heroPhotoCredit } from "@/features/home/home-hero-photo";
import { homeDisplayFont } from "@/features/home/home-fonts";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";
import { telHref, whatsappHref } from "@/lib/contact-links";
import { cn } from "@/lib/utils";

const heroImage = {
  desktop: "/images/hero/hero-aircraft-desktop.webp",
  mobile: "/images/hero/hero-aircraft-mobile.webp",
};

const whatsappMessage = "Hi GB International Travel, I'd like help with a flight ticket.";
const toursWhatsappMessage = "Hi GB International Travel, I'm planning a trip to Gilgit-Baltistan.";

/**
 * Airlines with scheduled flights in the live inventory (Admin → Flights) when this copy was written.
 * Keep in sync with the inventory; don't list airlines we don't currently sell.
 */
const inventoryAirlines = "PIA, airblue, AirSial, Fly Jinnah and Emirates";

function HeroBackground() {
  // Art direction: a portrait crop for phones, the wide crop from 768px up.
  // The photo is mostly smooth gradients, so a higher quality avoids banding and still stays small.
  const common = {
    alt: "Silhouette of an airliner wing against a sunrise on the horizon, seen from the cabin window",
    sizes: "100vw",
    fill: true,
    loading: "eager",
    fetchPriority: "high",
  } as const;
  const {
    props: { srcSet: mobileSrcSet, src: mobileSrc },
  } = getImageProps({ ...common, quality: 80, src: heroImage.mobile });
  const {
    props: { srcSet: desktopSrcSet, ...imgProps },
  } = getImageProps({ ...common, quality: 82, src: heroImage.desktop });

  // Preload only the variant that matches the viewport (LCP element).
  preload(mobileSrc, {
    as: "image",
    imageSrcSet: mobileSrcSet,
    imageSizes: "100vw",
    media: "(max-width: 767px)",
    fetchPriority: "high",
  });
  preload(imgProps.src, {
    as: "image",
    imageSrcSet: desktopSrcSet,
    imageSizes: "100vw",
    media: "(min-width: 768px)",
    fetchPriority: "high",
  });

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <picture className="absolute inset-0 block origin-[72%_50%] animate-gb-kenburns will-change-transform motion-reduce:animate-none">
        <source media="(max-width: 767px)" srcSet={mobileSrcSet} />
        <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
        <img {...imgProps} className="object-cover object-[72%_0%] md:object-[30%_58%] lg:object-[50%_58%]" />
      </picture>
      {/* Navy fades for headline contrast, plus a soft vignette. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,rgb(5_14_30/0.55)_0%,rgb(5_14_30/0.1)_14%,rgb(5_14_30/0.2)_28%,rgb(5_14_30/0.55)_55%,rgb(5_14_30/0.9)_100%)] md:bg-[linear-gradient(180deg,rgb(5_14_30/0.5)_0%,rgb(5_14_30/0)_22%,rgb(5_14_30/0)_58%,rgb(5_14_30/0.35)_76%,rgb(5_14_30/0.9)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgb(6_18_38/0.84)_0%,rgb(6_18_38/0.7)_32%,rgb(6_18_38/0.3)_52%,rgb(6_18_38/0)_68%)] md:block"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(130%_100%_at_62%_45%,transparent_55%,rgb(3_10_22/0.45)_100%)]"
      />
    </div>
  );
}

export function HomeHero() {
  return (
    <section aria-labelledby="home-hero-title" className="relative bg-white">
      <div className="relative isolate -mt-14 flex min-h-[86svh] flex-col overflow-hidden bg-[#071428] text-white md:min-h-[640px] lg:-mt-16 lg:min-h-[max(680px,90vh)]">
        <HeroBackground />

        <Container className="relative flex flex-1 flex-col justify-end pt-[calc(3.5rem+3rem)] pb-[12.25rem] sm:pb-[13rem] lg:justify-center lg:pt-[calc(4rem+1.5rem)] lg:pb-[17rem]">
          <p className="flex items-center gap-2.5 text-[0.625rem] font-medium tracking-[0.2em] whitespace-nowrap text-white/75 uppercase sm:gap-3 sm:text-[0.6875rem] sm:tracking-[0.34em]">
            <span className="hidden h-px w-10 bg-[#c9a96e] sm:block" aria-hidden />
            <Plane className="h-3.5 w-3.5 shrink-0 text-[#c9a96e]" strokeWidth={1.5} aria-hidden />
            Air tickets · Domestic &amp; International
          </p>

          <h1
            id="home-hero-title"
            className={cn(
              homeDisplayFont.className,
              "mt-5 max-w-[22ch] text-[2.375rem] leading-[1.05] sm:mt-6 font-medium tracking-[-0.012em] text-balance text-white [text-shadow:0_2px_28px_rgb(3_10_22/0.35)] sm:text-[3.5rem] lg:max-w-none lg:text-[min(4.25rem,6.6vh)] lg:leading-[1.0]",
            )}
          >
            Book domestic &amp; international
            <br className="hidden lg:block" /> air tickets at{" "}
            <br className="hidden lg:block" />
            <em className="text-[#e6d1a6] italic">fair, honest prices</em>
          </h1>

          <p className="mt-5 max-w-[35rem] text-[0.9375rem] leading-[1.7] text-white/85 sm:mt-6 sm:text-[1.0625rem] sm:font-light sm:text-white/80">
            A trusted way to fly {inventoryAirlines}: one{" "}
            <span className="whitespace-nowrap">all-inclusive</span> fare in PKR, with your e-ticket
            and PNR issued by our team.
          </p>

          <div className="mt-6 max-w-[36rem] border-l border-[#c9a96e]/70 pl-4 sm:mt-7 sm:pl-5">
            <p className="text-sm leading-relaxed text-white/80">
              <span
                className={cn(
                  homeDisplayFont.className,
                  "text-[1.125rem] text-[#e6d1a6] italic sm:text-[1.1875rem]",
                )}
              >
                Planning a trip to Gilgit-Baltistan?
              </span>{" "}
              Talk to a reliable local tour agency.
            </p>
            <p className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-white/80">
              <a
                href={whatsappHref(siteConfig.contactWhatsApp, toursWhatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 underline decoration-[#c9a96e]/70 decoration-1 underline-offset-[5px] transition-colors hover:text-white hover:decoration-[#c9a96e] focus-visible:outline-white"
              >
                <MessageCircle className="h-3.5 w-3.5 text-[#c9a96e]" strokeWidth={1.6} aria-hidden />
                <span className="sm:hidden">WhatsApp</span>
                <span className="hidden sm:inline">WhatsApp {siteConfig.contactWhatsApp}</span>
              </a>
              <a
                href={telHref(siteConfig.contactPhone)}
                className="inline-flex items-center gap-1.5 underline decoration-white/30 decoration-1 underline-offset-[5px] transition-colors hover:text-white hover:decoration-[#c9a96e] focus-visible:outline-white"
              >
                <Phone className="h-3.5 w-3.5 text-[#c9a96e]" strokeWidth={1.6} aria-hidden />
                <span className="sm:hidden">Call</span>
                <span className="hidden sm:inline">Call {siteConfig.contactPhone}</span>
              </a>
              <Link
                href="/tours"
                className="inline-flex items-center gap-1 font-medium text-[#e6d1a6] transition-colors hover:text-white focus-visible:outline-white"
              >
                Explore tours
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </p>
          </div>

          <p className="absolute right-8 bottom-[13.1rem] hidden items-center gap-3 text-[0.6875rem] tracking-[0.02em] text-white/50 lg:flex">
            <span className="h-px w-8 bg-[#c9a96e]/80" aria-hidden />
            <span>
              Photo:{" "}
              <a
                href={heroPhotoCredit.source}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white focus-visible:outline-white"
              >
                {heroPhotoCredit.author}
              </a>
              ,{" "}
              <a
                href={heroPhotoCredit.licenceUrl}
                target="_blank"
                rel="noopener noreferrer license"
                className="transition-colors hover:text-white focus-visible:outline-white"
              >
                {heroPhotoCredit.licence}
              </a>
            </span>
          </p>
        </Container>
      </div>

      <Container className="relative z-10 -mt-[10.5rem] lg:-mt-[14rem]">
        <HomeHeroSearch />
      </Container>
    </section>
  );
}

const trustPoints: {
  icon: LucideIcon;
  title: string;
  text: string;
  href?: string;
}[] = [
  {
    icon: ReceiptText,
    title: "All-inclusive fares",
    text: "No hidden charges. One clear fare in PKR, taxes included.",
  },
  {
    icon: MessageCircle,
    title: "Real people on WhatsApp",
    text: `Speak to our team directly on ${siteConfig.contactWhatsApp}.`,
    href: whatsappHref(siteConfig.contactWhatsApp, whatsappMessage),
  },
  {
    icon: BellRing,
    title: "E-ticket and reminders",
    text: "Your e-ticket, then reminders 24h, 5h and 3h before departure.",
  },
  {
    icon: Compass,
    title: "Flights, tours and visas",
    text: "Domestic and international flights, Northern tours and visa help.",
  },
];

export function HomeTrustStrip() {
  return (
    <section aria-label="Why travel with GB International Travel" className="bg-white">
      <Container className="pt-16 pb-16 sm:pt-20 lg:pb-20">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-9 sm:gap-x-10 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-0">
          {trustPoints.map((point) => {
            const Icon = point.icon;
            const content = (
              <>
                <Icon className="h-7 w-7 text-[#b08d57]" strokeWidth={1.15} aria-hidden />
                <span className="mt-5 block text-[0.6875rem] font-semibold tracking-[0.2em] text-[var(--color-navy)] uppercase transition-colors group-hover:text-[#8b6e3e]">
                  {point.title}
                </span>
                <span className="mt-2.5 block max-w-[17rem] text-sm leading-relaxed text-[var(--color-muted)]">
                  {point.text}
                </span>
              </>
            );
            return (
              <li
                key={point.title}
                className="lg:border-l lg:border-[#ebe4d6] lg:px-8 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
              >
                {point.href ? (
                  <a
                    href={point.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-[var(--radius-md)]"
                  >
                    {content}
                  </a>
                ) : (
                  <div>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
