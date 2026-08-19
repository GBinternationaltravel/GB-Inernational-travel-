import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getPublicUser } from "@/services/user-service";
import { Container } from "@/components/ui/container";
import { ProfileForm } from "@/features/account/profile-form";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Profile",
    description: "Manage your GB International Travel profile.",
    path: "/account/profile",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const sessionUser = await requireUser("/account/profile");
  const profile = await getPublicUser(sessionUser.id);

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl">Profile</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Update your personal preferences. Booking records cannot be edited here.
      </p>
      <div className="mt-8">
        <ProfileForm
          initial={{
            firstName: profile?.firstName ?? "",
            lastName: profile?.lastName ?? "",
            email: profile?.email ?? sessionUser.email,
            phone: profile?.phone ?? "",
            phoneCountryCode: profile?.phoneCountryCode ?? "+92",
            preferredCurrency: profile?.preferredCurrency ?? "PKR",
            preferredLanguage: profile?.preferredLanguage ?? "en",
            emailNotificationsOptIn: profile?.emailNotificationsOptIn ?? true,
            travelRemindersOptIn: profile?.travelRemindersOptIn ?? true,
            weatherUpdatesOptIn: profile?.weatherUpdatesOptIn ?? false,
            flightStatusAlertsOptIn: profile?.flightStatusAlertsOptIn ?? false,
          }}
        />
      </div>
    </Container>
  );
}
