import { prisma } from "@/lib/db";
import type {
  CreateUserInput,
  StoredUser,
  UserRepository,
} from "@/lib/auth/user-repository";
import type { ProfileUpdateInput } from "@/lib/validations/auth";
import { normalizeNotificationPreferences } from "@/lib/notifications/opt-in";

function mapUser(user: {
  id: string;
  email: string;
  passwordHash: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  phoneCountryCode: string | null;
  preferredCurrency: string;
  preferredLanguage: string;
  role: StoredUser["role"];
  isDemo: boolean;
  isActive: boolean;
  disabledAt: Date | null;
  emailNotificationsOptIn?: boolean;
  travelRemindersOptIn?: boolean;
  weatherUpdatesOptIn?: boolean;
  flightStatusAlertsOptIn?: boolean;
  createdAt: Date;
  updatedAt: Date;
}): StoredUser {
  const prefs = normalizeNotificationPreferences({
    emailNotificationsOptIn: user.emailNotificationsOptIn,
    travelRemindersOptIn: user.travelRemindersOptIn,
    weatherUpdatesOptIn: user.weatherUpdatesOptIn,
    flightStatusAlertsOptIn: user.flightStatusAlertsOptIn,
  });
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    phoneCountryCode: user.phoneCountryCode,
    preferredCurrency: user.preferredCurrency,
    preferredLanguage: user.preferredLanguage,
    role: user.role,
    isDemo: user.isDemo,
    isActive: user.isActive,
    disabledAt: user.disabledAt?.toISOString() ?? null,
    ...prefs,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class PrismaUserRepository implements UserRepository {
  async create(input: CreateUserInput): Promise<StoredUser> {
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        phoneCountryCode: input.phoneCountryCode,
        role: input.role ?? "CUSTOMER",
        isDemo: input.isDemo ?? false,
        isActive: true,
      },
    });
    return mapUser(user);
  }

  async findByEmail(email: string): Promise<StoredUser | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return user ? mapUser(user) : null;
  }

  async findById(id: string): Promise<StoredUser | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? mapUser(user) : null;
  }

  async updateProfile(
    id: string,
    input: ProfileUpdateInput,
  ): Promise<StoredUser | null> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          phoneCountryCode: input.phoneCountryCode,
          preferredCurrency: input.preferredCurrency,
          preferredLanguage: input.preferredLanguage,
          ...(typeof input.emailNotificationsOptIn === "boolean"
            ? { emailNotificationsOptIn: input.emailNotificationsOptIn }
            : {}),
          ...(typeof input.travelRemindersOptIn === "boolean"
            ? { travelRemindersOptIn: input.travelRemindersOptIn }
            : {}),
          ...(typeof input.weatherUpdatesOptIn === "boolean"
            ? { weatherUpdatesOptIn: input.weatherUpdatesOptIn }
            : {}),
          ...(typeof input.flightStatusAlertsOptIn === "boolean"
            ? { flightStatusAlertsOptIn: input.flightStatusAlertsOptIn }
            : {}),
        },
      });
      return mapUser(user);
    } catch {
      return null;
    }
  }

  async listAll(): Promise<StoredUser[]> {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    return users.map(mapUser);
  }

  async setActive(id: string, isActive: boolean): Promise<StoredUser | null> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          isActive,
          disabledAt: isActive ? null : new Date(),
        },
      });
      return mapUser(user);
    } catch {
      return null;
    }
  }

  async setRole(id: string, role: StoredUser["role"]): Promise<StoredUser | null> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { role },
      });
      return mapUser(user);
    } catch {
      return null;
    }
  }
}
