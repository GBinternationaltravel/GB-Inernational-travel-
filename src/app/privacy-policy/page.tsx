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
  title: "Privacy Policy",
  description:
    "How GB International Travel collects, uses, shares and protects your personal and passenger information, and how to request access to or deletion of your data.",
  path: "/privacy-policy",
});

const strong = "font-semibold text-[var(--color-navy)]";

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    content: (
      <p>
        GB International Travel is a Pakistan-based travel agency operating gbinternationaltravels.com.
        This policy explains what personal information we collect when you use our website or book with
        us, why we collect it, who we share it with and the choices you have. For any privacy question,
        email <ContactEmail />.
      </p>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    content: (
      <LegalList
        items={[
          <>
            <span className={strong}>Account details:</span> your name, email address and phone number,
            and your password, which is stored in encrypted (hashed) form and never visible to our staff.
          </>,
          <>
            <span className={strong}>Passenger details:</span> the names and dates of birth of the
            people travelling, and passport or CNIC numbers when the airline needs them to issue a
            ticket.
          </>,
          <>
            <span className={strong}>Booking history:</span> your booking requests, booking references
            (PNRs), e-tickets, payment status and messages about your trips.
          </>,
          <>
            <span className={strong}>Messages you send us</span> by email, phone or WhatsApp.
          </>,
        ]}
      />
    ),
  },
  {
    id: "how-we-use",
    title: "How we use your information",
    content: (
      <LegalList
        items={[
          "to create and manage your account;",
          "to handle your booking requests and issue your tickets with the airline;",
          "to send booking updates, your e-ticket and reminder emails before departure (24 hours, 5 hours and 3 hours before your flight);",
          "to answer your questions and help with changes, cancellations and refunds;",
          "to keep our website and your account secure and prevent fraud;",
          "to keep records that we are required to keep by law.",
        ]}
      />
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    content: (
      <>
        <p>
          <span className={strong}>We do not sell your personal information.</span> We share it only
          where needed to provide our services:
        </p>
        <LegalList
          items={[
            "Airlines and travel suppliers, including airline agent booking portals, receive passenger and booking details only to book and issue your tickets and provide the services you have requested.",
            "Resend, our email provider, sends booking notifications and reminder emails on our behalf.",
            "Vercel hosts our website and the data it processes.",
            "Government or law-enforcement authorities, if we are required by law to share information.",
          ]}
        />
        <p>
          Some of these providers, and airlines you fly with, may process data outside Pakistan. We share
          only what they need for the purpose described.
        </p>
      </>
    ),
  },
  {
    id: "payments",
    title: "Payments",
    content: (
      <p>
        You can pay using the payment methods shown at checkout or as advised by our team. We do not
        store your full card details on our servers. Where online card payment is offered, card details
        are handled by the payment provider.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    content: (
      <p>
        We use essential cookies to keep you signed in to your account and to keep a booking you have in
        progress secure. These cookies are needed for the website to work. If you block them in your
        browser, you will not be able to sign in or complete a booking.
      </p>
    ),
  },
  {
    id: "retention-security",
    title: "Keeping your information safe",
    content: (
      <p>
        We protect your information with access controls and secure connections, and we limit staff
        access to what is needed to handle your booking. We keep account and booking records for as
        long as your account is active or as needed to provide our services, resolve disputes and meet
        legal, tax and airline requirements. No method of transmission or storage is completely secure,
        but we work to protect your data.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your choices and rights",
    content: (
      <>
        <p>
          You can ask us for a copy of the personal information we hold about you, ask us to correct it
          or ask us to delete it. Email <ContactEmail /> from the address linked to your account so we
          can verify your request.
        </p>
        <p>
          We may need to keep some records, such as details of tickets already issued, where the law or
          an airline requires it. If so, we will tell you.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <p>
        Bookings for children must be made by a parent, guardian or other responsible adult, who
        provides the child&rsquo;s passenger details for ticketing.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law",
    content: (
      <p>
        This policy is governed by the laws of Pakistan. See also our{" "}
        <LegalLink href="/terms">Terms &amp; Conditions</LegalLink>.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        We may update this policy from time to time. The &ldquo;Last updated&rdquo; date above shows the
        latest version.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="How we collect, use and protect your personal and passenger information."
      path="/privacy-policy"
      intro={
        <p>
          Your privacy matters to us. We collect only the information we need to arrange your travel,
          and we never sell it.
        </p>
      }
      sections={sections}
    />
  );
}
