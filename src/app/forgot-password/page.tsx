import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Alert } from "@/components/ui/alert";
import { siteConfig } from "@/config/site";
import { mailtoHref, whatsappHref } from "@/lib/contact-links";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Forgot Password",
    description: "Get help signing in to your GB International Travel account.",
    path: "/forgot-password",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Container className="py-12">
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-3xl">Forgot password</h1>
        <Alert variant="info" className="mt-6">
          Online password reset is not available yet. If you cannot sign in, email us at{" "}
          <a href={mailtoHref()} className="font-medium text-[var(--color-brand)]">
            {siteConfig.contactEmail}
          </a>{" "}
          or message us on{" "}
          <a
            href={whatsappHref()}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--color-brand)]"
          >
            WhatsApp ({siteConfig.contactWhatsApp})
          </a>{" "}
          and our team will help you with your account and bookings.
        </Alert>
        <p className="mt-6 text-sm">
          <Link href="/login" className="text-[var(--color-brand)]">
            Back to login
          </Link>
        </p>
      </div>
    </Container>
  );
}
