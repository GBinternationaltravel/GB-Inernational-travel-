import type { UserRole } from "@prisma/client";
import type { ProfileUpdateInput, RegisterInput } from "@/lib/validations/auth";

export type StoredUser = {
  id: string;
  email: string;
  passwordHash: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  phoneCountryCode: string | null;
  preferredCurrency: string;
  preferredLanguage: string;
  role: UserRole;
  isDemo: boolean;
  isActive: boolean;
  disabledAt: string | null;
  emailNotificationsOptIn?: boolean;
  travelRemindersOptIn?: boolean;
  weatherUpdatesOptIn?: boolean;
  flightStatusAlertsOptIn?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserInput = RegisterInput & {
  passwordHash: string;
  role?: UserRole;
  isDemo?: boolean;
};

export interface UserRepository {
  create(input: CreateUserInput): Promise<StoredUser>;
  findByEmail(email: string): Promise<StoredUser | null>;
  findById(id: string): Promise<StoredUser | null>;
  updateProfile(id: string, input: ProfileUpdateInput): Promise<StoredUser | null>;
  listAll(): Promise<StoredUser[]>;
  setActive(id: string, isActive: boolean): Promise<StoredUser | null>;
  setRole?(id: string, role: UserRole): Promise<StoredUser | null>;
}
