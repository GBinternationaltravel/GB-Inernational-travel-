import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Forgot Password",
    description: "Password recovery placeholder.",
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
          Password recovery email delivery will be connected when a notification provider is
          configured. No reset emails are sent in this phase.
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
