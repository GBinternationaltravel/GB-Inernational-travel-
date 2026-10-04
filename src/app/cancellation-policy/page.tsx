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
  title: "Cancellation Policy",
  description:
    "How to cancel or change a flight booked with GB International Travel, including free cancellation before ticket issue, airline penalties, date changes and name changes.",
  path: "/cancellation-policy",
});

const strong = "font-semibold text-[var(--color-navy)]";

const sections: LegalSection[] = [
  {
    id: "before-issue",
    title: "Cancelling before your ticket is issued",
    content: (
      <p>
        Tickets are issued manually by our team after you submit a booking request. Until your ticket has
        been issued, you can <span className={strong}>cancel your booking request free of charge</span>.
        Any amount you have already paid is returned in full, as set out in our{" "}
        <LegalLink href="/refund-policy">Refund Policy</LegalLink>.
      </p>
    ),
  },
  {
    id: "after-issue",
    title: "Cancelling after your ticket is issued",
    content: (
      <>
        <p>Once your ticket has been issued:</p>
        <LegalList
          items={[
            "the airline's fare rules decide whether the ticket can be cancelled for a refund, and any airline cancellation penalties apply;",
            "our service charge is non-refundable;",
            "any refund due is paid within 7 to 30 days after the airline releases the funds, to the original payment method or by bank transfer.",
          ]}
        />
        <p>
          Please contact us before departure. Cancelling early usually gives you more options than not
          turning up for the flight.
        </p>
      </>
    ),
  },
  {
    id: "how-to-cancel",
    title: "How to cancel",
    content: (
      <>
        <p>
          Contact us by phone, WhatsApp or email at <ContactEmail /> with your booking reference or PNR
          and the names of the passengers you want to cancel. Because we issued your ticket, please
          cancel through us so we can handle it with the airline.
        </p>
        <p>
          Your cancellation takes effect when we confirm it to you. A message alone does not cancel a
          booking until we reply to confirm it.
        </p>
      </>
    ),
  },
  {
    id: "date-changes",
    title: "Date and flight changes",
    content: (
      <p>
        Changes to travel dates or flights follow the airline&rsquo;s fare rules. Where the airline allows
        a change, you pay any airline change penalty plus any difference in fare between your original
        ticket and the new one. Some fares cannot be changed. Contact us and we will check the options
        for your ticket.
      </p>
    ),
  },
  {
    id: "name-changes",
    title: "Name changes",
    content: (
      <p>
        Airline tickets are not transferable, and{" "}
        <span className={strong}>name changes are usually not allowed</span>. Please make sure every name
        matches the passenger&rsquo;s passport or CNIC exactly when you book. If you notice a mistake,
        contact us straight away. Whether a correction is possible depends on the airline.
      </p>
    ),
  },
  {
    id: "no-show",
    title: "No-shows",
    content: (
      <p>
        If a passenger does not travel and the booking was not cancelled beforehand, the airline&rsquo;s
        no-show rules apply. Any remaining refund follows those rules, and later flights on the same
        ticket may be cancelled by the airline.
      </p>
    ),
  },
  {
    id: "airline-changes",
    title: "Cancellations and changes by the airline",
    content: (
      <p>
        If the airline cancels or reschedules your flight, we will try to let you know as soon as we hear
        from the airline and help you with the rebooking or refund options it offers.
      </p>
    ),
  },
  {
    id: "before-you-fly",
    title: "Before you fly",
    content: (
      <>
        <p>
          We send reminder emails 24 hours, 5 hours and 3 hours before departure. Passengers are
          responsible for:
        </p>
        <LegalList
          items={[
            "carrying a valid passport, any visas required and a valid CNIC for domestic travel;",
            "arriving at the airport in time for check-in and boarding.",
          ]}
        />
        <p>
          Missing a flight because of invalid documents or late arrival is treated under the
          airline&rsquo;s rules in the same way as a no-show.
        </p>
      </>
    ),
  },
];

export default function CancellationPolicyPage() {
  return (
    <LegalPage
      title="Cancellation Policy"
      description="How to cancel or change your booking, and what airline rules and charges apply."
      path="/cancellation-policy"
      intro={
        <p>
          Plans change. This policy explains how cancellations and changes work for bookings made with GB
          International Travel. It should be read with our{" "}
          <LegalLink href="/refund-policy">Refund Policy</LegalLink> and{" "}
          <LegalLink href="/terms">Terms &amp; Conditions</LegalLink>.
        </p>
      }
      sections={sections}
    />
  );
}
