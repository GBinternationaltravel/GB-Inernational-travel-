import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminShell } from "@/features/admin/admin-shell";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Admin",
    description: "GB International Travel administration",
    path: "/admin",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminPage("/admin");
  const userName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.name ||
    user.email;

  return (
    <AdminShell userName={userName} userEmail={user.email} userRole={user.role}>
      {children}
    </AdminShell>
  );
}
