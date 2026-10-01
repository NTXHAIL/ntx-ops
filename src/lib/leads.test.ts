import { describe, expect, it } from "vitest";
import { consentProof, leadSubmissionSchema, normalizePhone } from "@/lib/leads";
import { SMS_CONSENT_TEXT, SMS_CONSENT_VERSION } from "@/lib/storms/consent";

describe("lead submission", () => {
  it("accepts a complete storm lead with UTMs", () => {
    const parsed = leadSubmissionSchema.safeParse({
      stormId: "storm_1",
      vehicleDamaged: "yes",
      insurance: "YES",
      zip: "75034",
      name: "Casey Nguyen",
      phone: "214-555-0199",
      email: "casey@example.com",
      preferredContact: "TEXT",
      smsConsent: true,
      utmSource: "facebook",
      utmMedium: "paid",
      utmCampaign: "dfw-hail",
      fbclid: "abc.123",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.utmCampaign).toBe("dfw-hail");
      expect(parsed.data.fbclid).toBe("abc.123");
    }
  });

  it("rejects a short ZIP", () => {
    const parsed = leadSubmissionSchema.safeParse({
      stormId: "storm_1",
      vehicleDamaged: "yes",
      insurance: "NOT_SURE",
      zip: "750",
      name: "A",
      phone: "214",
      preferredContact: "PHONE",
      smsConsent: false,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("consent proof", () => {
  it("stores versioned TCPA text only when the box is checked", () => {
    const yes = consentProof({
      smsConsent: true,
      pageUrl: "http://127.0.0.1:43147/storm/demo",
      ip: "203.0.113.10",
      userAgent: "Mozilla/5.0",
    });
    expect(yes.smsConsent).toBe(true);
    expect(yes.consentTextVersion).toBe(SMS_CONSENT_VERSION);
    expect(yes.consentText).toBe(SMS_CONSENT_TEXT);
    expect(yes.consentAt).toBeInstanceOf(Date);
    expect(yes.consentIp).toBe("203.0.113.10");

    const no = consentProof({ smsConsent: false, pageUrl: "http://x" });
    expect(no.smsConsent).toBe(false);
    expect(no.consentText).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("strips a leading 1", () => {
    expect(normalizePhone("+1 (214) 308-5779")).toBe("2143085779");
  });
});
