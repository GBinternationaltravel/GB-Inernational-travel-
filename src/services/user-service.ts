import {
  getAuthFieldErrors,
  profileUpdateSchema,
  registerSchema,
} from "@/lib/validations/auth";
import { hashPassword } from "@/lib/auth/password";
import { getUserRepository } from "@/lib/auth/get-user-repository";
import type { StoredUser } from "@/lib/auth/user-repository";
import { writeAuditLog } from "@/lib/security/audit";
import { redactForLogs } from "@/lib/booking/masking";

export class UserServiceError extends Error {
  constructor(
    message: string,
    readonly code: "VALIDATION" | "DUPLICATE" | "NOT_FOUND" | "DATABASE",
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "UserServiceError";
  }
}

export type PublicUser = Omit<StoredUser, "passwordHash">;

function toPublic(user: StoredUser): PublicUser {
  const prefs = {
    emailNotificationsOptIn: user.emailNotificationsOptIn ?? true,
    travelRemindersOptIn: user.travelRemindersOptIn ?? true,
    weatherUpdatesOptIn: user.weatherUpdatesOptIn ?? false,
    flightStatusAlertsOptIn: user.flightStatusAlertsOptIn ?? false,
  };
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    phoneCountryCode: user.phoneCountryCode,
    preferredCurrency: user.preferredCurrency,
    preferredLanguage: user.preferredLanguage,
    role: user.role,
    isDemo: user.isDemo,
    isActive: user.isActive ?? true,
    disabledAt: user.disabledAt ?? null,
    ...prefs,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const { repo } = await getUserRepository();
  return repo.findByEmail(email);
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const { repo } = await getUserRepository();
  return repo.findById(id);
}

export async function registerCustomer(rawInput: unknown): Promise<PublicUser> {
  const parsed = registerSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new UserServiceError(
      "Please check your registration details.",
      "VALIDATION",
      getAuthFieldErrors(parsed.error),
    );
  }

  const { repo, kind } = await getUserRepository();
  const existing = await repo.findByEmail(parsed.data.email);
  if (existing) {
    throw new UserServiceError(
      "An account with this email already exists.",
      "DUPLICATE",
      { email: "An account with this email already exists." },
    );
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await repo.create({
      ...parsed.data,
      passwordHash,
      role: "CUSTOMER",
    });

    await writeAuditLog({
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      metadata: redactForLogs({ email: user.email, store: kind }),
    });

    return toPublic(user);
  } catch (error) {
    if (error instanceof UserServiceError) throw error;
    if (error instanceof Error && error.message === "DUPLICATE_EMAIL") {
      throw new UserServiceError(
        "An account with this email already exists.",
        "DUPLICATE",
        { email: "An account with this email already exists." },
      );
    }
    throw new UserServiceError(
      "We couldn't create your account right now. Please try again.",
      "DATABASE",
    );
  }
}

export async function getPublicUser(id: string): Promise<PublicUser | null> {
  const user = await findUserById(id);
  return user ? toPublic(user) : null;
}

export async function updateUserProfile(
  userId: string,
  rawInput: unknown,
): Promise<PublicUser> {
  const parsed = profileUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new UserServiceError(
      "Please check your profile details.",
      "VALIDATION",
      getAuthFieldErrors(parsed.error),
    );
  }

  const { repo } = await getUserRepository();
  const updated = await repo.updateProfile(userId, parsed.data);
  if (!updated) {
    throw new UserServiceError("We couldn't update your profile.", "NOT_FOUND");
  }

  await writeAuditLog({
    userId,
    action: "USER_PROFILE_UPDATED",
    entityType: "User",
    entityId: userId,
  });

  return toPublic(updated);
}
