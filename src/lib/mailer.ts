export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type Mailer = {
  send(message: MailMessage): Promise<void>;
};

export function staffNotifyEmail() {
  return process.env.STAFF_NOTIFY_EMAIL || "admin@ntxhail.local";
}

export function createMailer(): Mailer {
  const host = process.env.SMTP_HOST;
  if (!host) {
    return {
      async send(message) {
        console.log("[mailer:dev]", message.subject, "→", message.to);
        console.log(message.text);
      },
    };
  }

  return {
    async send(message) {
      const port = Number(process.env.SMTP_PORT || 587);
      const user = process.env.SMTP_USER || "";
      const pass = process.env.SMTP_PASS || "";
      const from = process.env.SMTP_FROM || "Hail Ops <ops@ntxhail.local>";
      const auth = user ? `${user}:${pass}@` : "";
      const url = `smtp://${auth}${host}:${port}`;
      // Phase 1: SMTP env selects this transport. Swap the body for nodemailer
      // (or another client) when Joseph has a real mailbox. Until then we log.
      console.log("[mailer:smtp]", url, message.subject, "→", message.to);
      console.log("From:", from);
      console.log(message.text);
    },
  };
}

export async function notifyStaffNewLead(input: {
  stormName: string;
  name: string;
  phone: string;
  zip: string;
  landingUrl: string;
}) {
  const mailer = createMailer();
  await mailer.send({
    to: staffNotifyEmail(),
    subject: `New hail lead — ${input.stormName}`,
    text: [
      `${input.name} submitted a storm lead.`,
      `Phone: ${input.phone}`,
      `ZIP: ${input.zip}`,
      `Storm: ${input.stormName}`,
      `Landing: ${input.landingUrl}`,
      "",
      "Do not text or email the customer from this notification. Contact them from the Leads inbox.",
    ].join("\n"),
  });
}
