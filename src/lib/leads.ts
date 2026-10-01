import { z } from "zod";
import { SMS_CONSENT_TEXT, SMS_CONSENT_VERSION } from "@/lib/storms/consent";

export const leadSubmissionSchema = z.object({
  stormId: z.string().min(1),
  vehicleDamaged: z.enum(["yes", "no"]),
  insurance: z.enum(["YES", "NO", "NOT_SURE"]),
  vehicleYear: z.string().trim().max(8).optional().default(""),
  vehicleMake: z.string().trim().max(40).optional().default(""),
  vehicleModel: z.string().trim().max(40).optional().default(""),
  vin: z.string().trim().max(17).optional().default(""),
  zip: z.string().trim().regex(/^\d{5}$/, "ZIP must be 5 digits"),
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().min(10, "Mobile phone is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  preferredContact: z.enum(["PHONE", "TEXT", "EMAIL"]),
  smsConsent: z.boolean(),
  utmSource: z.string().optional().default(""),
  utmMedium: z.string().optional().default(""),
  utmCampaign: z.string().optional().default(""),
  utmTerm: z.string().optional().default(""),
  utmContent: z.string().optional().default(""),
  fbclid: z.string().optional().default(""),
  gclid: z.string().optional().default(""),
  pageUrl: z.string().optional().default(""),
});

export type LeadSubmission = z.infer<typeof leadSubmissionSchema>;

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

export function consentProof(input: {
  smsConsent: boolean;
  pageUrl: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  if (!input.smsConsent) {
    return {
      smsConsent: false,
      consentTextVersion: null,
      consentText: null,
      consentAt: null,
      consentIp: null,
      consentUserAgent: null,
      consentPageUrl: null,
    };
  }
  return {
    smsConsent: true,
    consentTextVersion: SMS_CONSENT_VERSION,
    consentText: SMS_CONSENT_TEXT,
    consentAt: new Date(),
    consentIp: input.ip ?? null,
    consentUserAgent: input.userAgent ?? null,
    consentPageUrl: input.pageUrl || null,
  };
}
