import { z } from "zod";

export const passwordConfig = {
  minLength: 8,
  maxLength: 72,
} as const;

const passwordSchema = z
  .string()
  .min(passwordConfig.minLength, `Password must be at least ${passwordConfig.minLength} characters`)
  .max(passwordConfig.maxLength, "Password is too long");

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(60)
      .regex(/^[A-Za-z][A-Za-z\s'-]*$/, "Use letters only"),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(60)
      .regex(/^[A-Za-z][A-Za-z\s'-]*$/, "Use letters only"),
    email: z.string().trim().email("Please enter a valid email").max(120),
    phoneCountryCode: z
      .string()
      .trim()
      .regex(/^\+\d{1,4}$/, "Please select a country calling code")
      .default("+92"),
    phone: z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s()-]/g, ""))
      .refine((value) => /^\d{7,15}$/.test(value), {
        message: "Please enter a valid phone number",
      }),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const profileUpdateSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(60)
    .regex(/^[A-Za-z][A-Za-z\s'-]*$/, "Use letters only"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(60)
    .regex(/^[A-Za-z][A-Za-z\s'-]*$/, "Use letters only"),
  phoneCountryCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, "Please select a country calling code"),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .refine((value) => /^\d{7,15}$/.test(value), {
      message: "Please enter a valid phone number",
    }),
  preferredCurrency: z.enum(["PKR", "USD", "EUR", "GBP", "AED"]),
  preferredLanguage: z.enum(["en", "ur", "ar"]),
  emailNotificationsOptIn: z.boolean().optional(),
  travelRemindersOptIn: z.boolean().optional(),
  weatherUpdatesOptIn: z.boolean().optional(),
  flightStatusAlertsOptIn: z.boolean().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export function getAuthFieldErrors(error: z.ZodError): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!messages[key]) messages[key] = issue.message;
  }
  return messages;
}
