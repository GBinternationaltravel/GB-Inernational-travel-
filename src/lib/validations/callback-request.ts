import { z } from "zod";

export const callbackRequestSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z
    .string()
    .trim()
    .min(8, "Please enter a phone number")
    .max(20)
    .regex(/^[0-9+\s()-]+$/, "Use digits and a country code"),
  message: z.string().trim().max(500).optional().default(""),
  companyWebsite: z.string().max(200).optional().default(""),
});

export type CallbackRequestInput = z.infer<typeof callbackRequestSchema>;
