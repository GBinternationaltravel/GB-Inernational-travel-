import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type {
  CreateUserInput,
  StoredUser,
  UserRepository,
} from "@/lib/auth/user-repository";
import type { ProfileUpdateInput } from "@/lib/validations/auth";
import { normalizeNotificationPreferences } from "@/lib/notifications/opt-in";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "users.json");

async function readAll(): Promise<StoredUser[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const users = JSON.parse(raw) as StoredUser[];
    return users.map((user) => {
      const prefs = normalizeNotificationPreferences(user);
      return {
        ...user,
        ...prefs,
        isActive: user.isActive ?? true,
        disabledAt: user.disabledAt ?? null,
      };
    });
  } catch {
    return [];
  }
}

async function writeAll(users: StoredUser[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
}

export class FileUserRepository implements UserRepository {
  async create(input: CreateUserInput): Promise<StoredUser> {
    const users = await readAll();
    if (users.some((user) => user.email === input.email.toLowerCase())) {
      throw new Error("DUPLICATE_EMAIL");
    }
    const now = new Date().toISOString();
    const prefs = normalizeNotificationPreferences();
    const user: StoredUser = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      phoneCountryCode: input.phoneCountryCode,
      preferredCurrency: "PKR",
      preferredLanguage: "en",
      role: input.role ?? "CUSTOMER",
      isDemo: input.isDemo ?? false,
      isActive: true,
      disabledAt: null,
      ...prefs,
      createdAt: now,
      updatedAt: now,
    };
    users.push(user);
    await writeAll(users);
    return user;
  }

  async findByEmail(email: string): Promise<StoredUser | null> {
    const users = await readAll();
    return users.find((user) => user.email === email.toLowerCase()) ?? null;
  }

  async findById(id: string): Promise<StoredUser | null> {
    const users = await readAll();
    return users.find((user) => user.id === id) ?? null;
  }

  async updateProfile(
    id: string,
    input: ProfileUpdateInput,
  ): Promise<StoredUser | null> {
    const users = await readAll();
    const index = users.findIndex((user) => user.id === id);
    if (index < 0) return null;
    const current = users[index]!;
    const updated: StoredUser = {
      ...current,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      phoneCountryCode: input.phoneCountryCode,
      preferredCurrency: input.preferredCurrency,
      preferredLanguage: input.preferredLanguage,
      emailNotificationsOptIn:
        typeof input.emailNotificationsOptIn === "boolean"
          ? input.emailNotificationsOptIn
          : (current.emailNotificationsOptIn ?? true),
      travelRemindersOptIn:
        typeof input.travelRemindersOptIn === "boolean"
          ? input.travelRemindersOptIn
          : (current.travelRemindersOptIn ?? true),
      weatherUpdatesOptIn:
        typeof input.weatherUpdatesOptIn === "boolean"
          ? input.weatherUpdatesOptIn
          : (current.weatherUpdatesOptIn ?? false),
      flightStatusAlertsOptIn:
        typeof input.flightStatusAlertsOptIn === "boolean"
          ? input.flightStatusAlertsOptIn
          : (current.flightStatusAlertsOptIn ?? false),
      updatedAt: new Date().toISOString(),
    };
    users[index] = updated;
    await writeAll(users);
    return updated;
  }

  async listAll(): Promise<StoredUser[]> {
    const users = await readAll();
    return users.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async setActive(id: string, isActive: boolean): Promise<StoredUser | null> {
    const users = await readAll();
    const index = users.findIndex((user) => user.id === id);
    if (index < 0) return null;
    const current = users[index]!;
    const updated: StoredUser = {
      ...current,
      isActive,
      disabledAt: isActive ? null : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users[index] = updated;
    await writeAll(users);
    return updated;
  }

  async setRole(id: string, role: StoredUser["role"]): Promise<StoredUser | null> {
    const users = await readAll();
    const index = users.findIndex((user) => user.id === id);
    if (index < 0) return null;
    const current = users[index]!;
    const updated: StoredUser = {
      ...current,
      role,
      updatedAt: new Date().toISOString(),
    };
    users[index] = updated;
    await writeAll(users);
    return updated;
  }
}
