import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/register-form";
import { Container } from "@/components/ui/container";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Create Account",
    description: "Create a GB International Travel customer account.",
    path: "/register",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <Container className="py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl">Create Account</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Save trips and manage bookings in one place.
        </p>
      </div>
      <RegisterForm />
    </Container>
  );
}
