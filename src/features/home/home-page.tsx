import Link from "next/link";
import { Bell, BookOpen, CloudSun, MapPinned, Plus, type LucideIcon } from "lucide-react";
import { HomeHero, HomeTrustStrip } from "@/features/home/home-hero";
import { HomeSignatureDestinations } from "@/features/home/home-signature-destinations";
import { HomePopularRoutes } from "@/features/home/home-popular-routes";
import { QuickAssistanceLoader } from "@/components/chatbot/quick-assistance-loader";
import { Container } from "@/components/ui/container";
import { homeDisplayFont } from "@/features/home/home-fonts";
import { siteConfig } from "@/config/site";
import { whatsappHref } from "@/lib/contact-links";
import { cn } from "@/lib/utils";
import { foundationFaqs } from "@/data/mock/content";

export function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeTrustStrip />

      <HomeSignatureDestinations />
      <HomePopularRoutes />

      <section aria-labelledby="companion-title" className="bg-[#faf8f4]">
        <Container className="grid gap-12 py-20 sm:py-24 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <HomeHeading
              id="companion-title"
              eyebrow="Before you fly"
              title="Travel with confidence"
              text="Weather, travel alerts and guides for the places we know best, from Gilgit-Baltistan to the Gulf."
            />
          </div>
          <ul className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:col-span-8">
            <CompanionItem
              icon={CloudSun}
              title="Destination weather"
              text="Plan with weather insight for Gilgit-Baltistan and international cities."
            />
            <CompanionItem
              icon={Bell}
              title="Travel updates"
              text="Road, flight and weather updates for safer travel planning."
              href="/travel-updates"
            />
            <CompanionItem
              icon={BookOpen}
              title="Travel guides"
              text="Editorial guides for destinations across Pakistan and beyond."
              href="/travel-guides"
            />
            <CompanionItem
              icon={MapPinned}
              title="Local expertise"
              text="A Pakistan-based team with international reach, and real people on WhatsApp."
            />
          </ul>
        </Container>
      </section>

      <section aria-labelledby="faq-title" className="bg-white">
        <Container className="grid gap-12 py-20 sm:py-24 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <HomeHeading
              id="faq-title"
              eyebrow="Questions"
              title="Frequently asked"
              text="Quick answers about booking with GB International Travel."
            />
            <Link
              href="/faq"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-navy)] underline decoration-[#c9a96e] decoration-1 underline-offset-[6px] hover:text-[#8b6e3e]"
            >
              View all FAQs
            </Link>
          </div>
          <div className="divide-y divide-[#ebe5da] border-y border-[#ebe5da] lg:col-span-8">
            {foundationFaqs.map((faq) => (
              <details key={faq.id} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[1.0625rem] font-medium text-[var(--color-navy)] [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <Plus
                    className="h-4 w-4 shrink-0 text-[#8b6e3e] transition-transform duration-300 group-open:rotate-45"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section aria-labelledby="home-cta-title" className="bg-white pb-20 sm:pb-24">
        <Container>
          <div className="relative overflow-hidden rounded-[28px] bg-[#0a1a31] px-6 py-14 text-white sm:px-14 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_0%,rgb(201_169_110/0.18),transparent_60%)]"
            />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="flex items-center gap-3 text-[0.625rem] font-semibold tracking-[0.3em] text-[#d9c08f] uppercase">
                  <span className="h-px w-8 bg-[#c9a96e]" aria-hidden />
                  Ready when you are
                </p>
                <h2
                  id="home-cta-title"
                  className={cn(
                    homeDisplayFont.className,
                    "mt-4 max-w-xl text-[2.25rem] leading-[1.08] font-medium text-white sm:text-[2.75rem]",
                  )}
                >
                  Plan your next journey with us
                </h2>
                <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-white/75">
                  Search flights, explore Northern tours, or tell our team what you have in mind.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
                <Link
                  href="/flights"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#c9a96e] px-7 text-sm font-semibold tracking-[0.02em] text-[#0b1f3a] transition-colors hover:bg-[#d8bd8a] focus-visible:outline-white"
                >
                  Book a flight
                </Link>
                <a
                  href={whatsappHref(siteConfig.contactWhatsApp, "Hi GB International Travel, I'd like help planning a trip.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center text-sm text-white/85 underline decoration-[#c9a96e]/70 decoration-1 underline-offset-[6px] hover:text-white"
                >
                  WhatsApp {siteConfig.contactWhatsApp}
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <QuickAssistanceLoader />
    </>
  );
}

function HomeHeading({
  id,
  eyebrow,
  title,
  text,
}: {
  id: string;
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-3 text-[0.625rem] font-semibold tracking-[0.3em] text-[#8b6e3e] uppercase">
        <span className="h-px w-8 bg-[#c9a96e]" aria-hidden />
        {eyebrow}
      </p>
      <h2
        id={id}
        className={cn(
          homeDisplayFont.className,
          "mt-4 text-[2.25rem] leading-[1.08] font-medium tracking-[-0.01em] text-[var(--color-navy)] sm:text-[2.75rem]",
        )}
      >
        {title}
      </h2>
      {text ? (
        <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-[var(--color-muted)]">
          {text}
        </p>
      ) : null}
    </div>
  );
}

function CompanionItem({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  href?: string;
}) {
  const body = (
    <>
      <Icon className="h-7 w-7 text-[#b08d57]" strokeWidth={1.15} aria-hidden />
      <h3 className="mt-5 text-[0.6875rem] font-semibold tracking-[0.2em] text-[var(--color-navy)] uppercase transition-colors group-hover:text-[#8b6e3e]">
        {title}
      </h3>
      <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-[var(--color-muted)]">{text}</p>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="group block rounded-[var(--radius-md)]">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}
