import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";
import { Container } from "@/components/ui/container";
import { LoadingState } from "@/components/ui/loading-state";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Login",
    description: "Sign in to GB International Travel.",
    path: "/login",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Container className="py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl">Login</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Access your trips and account settings.
        </p>
      </div>
      <Suspense fallback={<LoadingState label="Loading login…" />}>
        <LoginForm />
      </Suspense>
    </Container>
  );
}
