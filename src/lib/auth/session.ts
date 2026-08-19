import { auth } from "@/auth";
import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    name: session.user.name,
  };
}

export async function requireUser(callbackUrl = "/account"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (!isAdminRole(user.role)) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/admin")}&error=forbidden`);
  }
  return user;
}

export function isAdminRole(role: UserRole): boolean {
  return (
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "MANAGER" ||
    role === "TICKET_ISSUER" ||
    role === "ACCOUNTANT" ||
    role === "SUPPORT" ||
    role === "STAFF" ||
    role === "AGENT"
  );
}
