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
  title: "Refund Policy",
  description:
    "How refunds work for flights booked with GB International Travel: airline fare rules, what is refundable, processing times and how to request a refund.",
  path: "/refund-policy",
});

const strong = "font-semibold text-[var(--color-navy)]";

const sections: LegalSection[] = [
  {
    id: "overview",
    title: "How refunds work",
    content: (
      <p>
        Every airline ticket comes with fare rules set by the airline. Those rules decide whether a
        ticket can be refunded, how much can be refunded and what cancellation or change penalties
        apply. We process refunds in line with the airline&rsquo;s fare rules for your ticket.
      </p>
    ),
  },
  {
    id: "before-issue",
    title: "Before your ticket is issued",
    content: (
      <p>
        A booking request can be cancelled{" "}
        <span className={strong}>free of charge before the ticket is issued</span>. If you have already
        made a payment, the amount you paid is returned in full to the original payment method or by
        bank transfer.
      </p>
    ),
  },
  {
    id: "after-issue",
    title: "After your ticket is issued",
    content: (
      <>
        <p>Once a ticket has been issued, your refund is worked out as follows:</p>
        <LegalList
          items={[
            "The airline's fare rules decide whether the ticket is refundable and how much the airline will return.",
            "Any airline cancellation or change penalties are deducted.",
            <>
              <span className={strong}>Our service charge is non-refundable</span> once the ticket has
              been issued.
            </>,
          ]}
        />
        <p>
          Some fares are non-refundable. Depending on the airline&rsquo;s rules, a part of the fare, such
          as certain taxes, may still be refundable. Contact us before you cancel and we will check your
          fare rules and let you know what to expect.
        </p>
      </>
    ),
  },
  {
    id: "no-show",
    title: "No-shows and missed flights",
    content: (
      <p>
        If you do not travel on a booked flight without cancelling first (a &ldquo;no-show&rdquo;), any
        refund follows the airline&rsquo;s no-show rules. Many fares allow little or no refund after a
        no-show, so please contact us as early as possible if your plans change. The same applies if you
        are refused boarding because of missing or invalid travel documents, or you arrive at the airport
        too late to check in.
      </p>
    ),
  },
  {
    id: "airline-changes",
    title: "Flights cancelled or changed by the airline",
    content: (
      <p>
        If the airline cancels your flight or makes a significant schedule change, the options available
        to you, such as rebooking or a refund, are those offered under the airline&rsquo;s policy. We
        will help you choose and handle the request with the airline for you.
      </p>
    ),
  },
  {
    id: "timing",
    title: "When and how you will be paid",
    content: (
      <>
        <p>
          Refunds are paid <span className={strong}>within 7 to 30 days after the airline releases the
          funds</span> to us. Airlines take their own time to process refunds before releasing funds,
          and this can vary by airline.
        </p>
        <p>
          Refunds are paid to the original payment method or by bank transfer. All amounts are in
          Pakistani Rupees (PKR).
        </p>
      </>
    ),
  },
  {
    id: "how-to-request",
    title: "How to request a refund",
    content: (
      <>
        <p>
          Contact us by email at <ContactEmail />, or by phone or WhatsApp using the details below,
          and include:
        </p>
        <LegalList
          items={[
            "your booking reference or PNR;",
            "the names of the passengers the refund is for;",
            "the reason for the request (for example, a cancellation or a flight cancelled by the airline).",
          ]}
        />
        <p>
          For security, we may need to confirm the request with the person who made the booking. See our{" "}
          <LegalLink href="/cancellation-policy">Cancellation Policy</LegalLink> for how to cancel a
          booking.
        </p>
      </>
    ),
  },
  {
    id: "tours-and-visas",
    title: "Tours and visa services",
    content: (
      <p>
        Refunds for tours and visa services depend on the conditions given to you when you book and on
        what the relevant suppliers or authorities return. A visa refusal is a decision of the
        authority concerned. Please contact us for the conditions that apply to your booking.
      </p>
    ),
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      description="What can be refunded, how long it takes and how to request a refund for your booking."
      path="/refund-policy"
      intro={
        <p>
          This policy explains how refunds work for bookings made with GB International Travel. It
          should be read with our <LegalLink href="/terms">Terms &amp; Conditions</LegalLink>.
        </p>
      }
      sections={sections}
    />
  );
}
