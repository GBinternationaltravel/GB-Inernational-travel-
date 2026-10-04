import type { Metadata } from "next";
import {
  ContactEmail,
  LegalLink,
  LegalList,
  LegalPage,
  type LegalSection,
} from "@/components/legal/legal-page";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Conditions",
  description:
    "Terms & Conditions for booking flights, tours and visa services with GB International Travel, including ticket issuance, payment, passenger responsibilities and governing law.",
  path: "/terms",
});

const sections: LegalSection[] = [
  {
    id: "about",
    title: "About these terms",
    content: (
      <>
        <p>
          These Terms &amp; Conditions apply to your use of gbinternationaltravels.com and to every
          booking request you make with GB International Travel (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
          &ldquo;our&rdquo;), a Pakistan-based travel agency offering domestic and international
          flights, tours and visa services.
        </p>
        <p>
          By creating an account, using the website or submitting a booking request, you agree to these
          terms together with our <LegalLink href="/privacy-policy">Privacy Policy</LegalLink>,{" "}
          <LegalLink href="/refund-policy">Refund Policy</LegalLink> and{" "}
          <LegalLink href="/cancellation-policy">Cancellation Policy</LegalLink>. If you make a booking
          for other passengers, you confirm that you are authorised to do so and that they accept these
          terms.
        </p>
      </>
    ),
  },
  {
    id: "our-role",
    title: "Our role as your travel agent",
    content: (
      <>
        <p>
          We arrange travel on your behalf. Flights are operated by the airline, and your journey is
          governed by that airline&rsquo;s conditions of carriage and the fare rules of the ticket you
          buy, including rules on baggage, check-in, changes, cancellations and refunds.
        </p>
        <p>
          Tours and visa services may involve third-party suppliers. Visa decisions are made only by the
          relevant embassy or immigration authority. We cannot guarantee that a visa will be granted or
          how long an authority will take to decide.
        </p>
      </>
    ),
  },
  {
    id: "account",
    title: "Your account",
    content: (
      <LegalList
        items={[
          "Please give accurate details (name, email address and phone number) and keep them up to date so we can reach you about your booking.",
          "Keep your password private. You are responsible for activity on your account.",
          "We may suspend an account that is used fraudulently or in breach of these terms.",
        ]}
      />
    ),
  },
  {
    id: "booking-and-tickets",
    title: "Booking requests and ticket issuance",
    content: (
      <>
        <p>
          Tickets are issued manually by our team. When you submit a booking request, we book your
          flight directly with the airline or through an airline agent portal, then send you your
          e-ticket and booking reference (PNR).
        </p>
        <p>
          <strong className="font-semibold text-[var(--color-navy)]">
            A booking request or a payment is not a confirmed ticket.
          </strong>{" "}
          Your booking is confirmed only once the ticket has been issued and you have received your
          e-ticket. Until then, seats and fares are not guaranteed. If the fare or seat availability
          changes before we issue your ticket, we will contact you before going ahead.
        </p>
        <p>
          When you receive your e-ticket, please check every passenger name, date, flight and route
          straight away and tell us immediately if anything is wrong.
        </p>
      </>
    ),
  },
  {
    id: "prices-and-payment",
    title: "Prices and payment",
    content: (
      <LegalList
        items={[
          "Prices are shown in Pakistani Rupees (PKR).",
          "The fare shown for a flight is one all-inclusive price that includes applicable taxes and charges, unless clearly stated otherwise.",
          "Prices can change until your ticket is issued, because airlines change fares and availability in real time.",
          "You can pay using the payment methods shown at checkout or as advised by our team. Your booking is confirmed by our team when your ticket is issued, not at the moment of payment.",
          "We do not store your full card details on our servers.",
        ]}
      />
    ),
  },
  {
    id: "passenger-responsibilities",
    title: "Passenger responsibilities",
    content: (
      <>
        <p>Each passenger is responsible for:</p>
        <LegalList
          items={[
            "giving names exactly as they appear on the passport or CNIC that will be used for travel;",
            "holding a valid passport, any visas and transit visas required, a valid CNIC for domestic travel, and meeting all entry, exit and health requirements;",
            "arriving at the airport in good time for check-in and boarding, following the airline's deadlines;",
            "checking flight times before travelling, as airlines can change schedules.",
          ]}
        />
        <p>
          We send reminder emails 24 hours, 5 hours and 3 hours before departure as a courtesy. They do
          not replace your own responsibility to check your flight and reach the airport on time. If you
          are refused boarding or entry because of missing or invalid documents, or you miss your flight
          by arriving late, the airline&rsquo;s fare rules apply and we cannot refund costs that the
          airline does not refund.
        </p>
      </>
    ),
  },
  {
    id: "changes-cancellations-refunds",
    title: "Changes, cancellations and refunds",
    content: (
      <>
        <p>
          A booking request can be cancelled free of charge before the ticket is issued. After issue,
          changes, cancellations and refunds follow the airline&rsquo;s fare rules and any airline
          penalties, and our service charge is non-refundable. Name changes are usually not allowed.
        </p>
        <p>
          Full details are in our <LegalLink href="/cancellation-policy">Cancellation Policy</LegalLink>{" "}
          and <LegalLink href="/refund-policy">Refund Policy</LegalLink>.
        </p>
      </>
    ),
  },
  {
    id: "schedule-changes",
    title: "Airline schedule changes and disruption",
    content: (
      <p>
        Airlines may change flight times, cancel flights or change aircraft. When an airline tells us
        about a change to your booking, we will try to let you know as soon as possible and help you
        with the options the airline offers, such as rebooking or a refund under its policy. Delays,
        cancellations, denied boarding and baggage issues are the responsibility of the operating
        airline under its conditions of carriage.
      </p>
    ),
  },
  {
    id: "tours-and-visas",
    title: "Tours and visa services",
    content: (
      <LegalList
        items={[
          "Tour itineraries, inclusions and prices are as described for the tour at the time of booking. We will tell you of any specific conditions before you confirm.",
          "Visa information on this website is general guidance. Requirements can change at any time, so always check them with the official embassy or authority before you apply or travel.",
          "You are responsible for giving complete and truthful information and documents for any visa application.",
        ]}
      />
    ),
  },
  {
    id: "liability",
    title: "Our liability",
    content: (
      <>
        <p>
          We take care in arranging your travel. To the extent allowed by law, we are not liable for
          losses caused by airlines, hotels, tour suppliers or authorities, or by events outside our
          reasonable control such as weather, strikes, airspace closures or government action.
        </p>
        <p>
          Nothing in these terms limits any rights you have under the laws of Pakistan that cannot be
          excluded.
        </p>
      </>
    ),
  },
  {
    id: "website-use",
    title: "Using our website",
    content: (
      <p>
        Please use the website only for genuine travel enquiries and bookings. Do not misuse it, try to
        access other people&rsquo;s accounts or bookings, or interfere with its operation. We work to
        keep the information on the website accurate, but travel information, schedules and visa rules
        can change, and we may correct errors or update content at any time.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law",
    content: (
      <p>
        These terms are governed by the laws of Pakistan, and any dispute will be subject to the
        jurisdiction of the courts of Pakistan.
      </p>
    ),
  },
  {
    id: "changes-to-terms",
    title: "Changes to these terms",
    content: (
      <p>
        We may update these terms from time to time. The &ldquo;Last updated&rdquo; date above shows the
        latest version. The terms in force when you submitted your booking request apply to that
        booking. Questions? Email us at <ContactEmail />.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      description="The terms that apply when you use our website and book flights, tours or visa services with GB International Travel."
      path="/terms"
      intro={
        <p>
          Please read these terms before submitting a booking request. They explain how bookings and
          tickets work, what we are responsible for and what passengers need to do.
        </p>
      }
      sections={sections}
    />
  );
}
