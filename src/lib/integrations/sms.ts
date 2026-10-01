/**
 * Twilio SMS (phase 2).
 *
 * Do not send SMS to leads in phase 1. This module is the hook for later:
 * speed-to-lead texts only after TCPA consent + 10DLC registration.
 */
export type SmsMessage = {
  to: string;
  body: string;
};

export type SmsClient = {
  send(message: SmsMessage): Promise<{ id: string }>;
};

export function createSmsClient(): SmsClient | null {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  return {
    async send() {
      throw new Error("Twilio SMS is not enabled in Storm Leads phase 1.");
    },
  };
}
