import Link from "next/link";
import { BRAND_NAME, BRAND_EMAIL, LEGAL_NAME } from "@/lib/constants";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="bg-[#0a1628] px-4 py-4 text-white">
        <Link href="/" className="text-[17px] font-black tracking-[1.5px]">
          HAILSPEC
        </Link>
        <p className="text-[9px] font-bold tracking-widest text-blue-300 uppercase">by {BRAND_NAME}</p>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          LEGAL REVIEW — placeholder copy for Joseph / counsel. Do not treat as a finished policy.
        </p>
        <h1 className="mt-4 text-3xl font-black">Privacy policy</h1>
        <p className="mt-2 text-sm text-slate-500">{LEGAL_NAME}</p>

        <Section title="Who we are">
          NTX Hail is a hail and paintless dent repair shop. This page describes how storm-landing
          pages inside Hail Ops collect information. [LEGAL REVIEW: confirm entity name, addresses,
          and DPO/contact.]
        </Section>
        <Section title="What we collect">
          Name, mobile phone, email, ZIP, vehicle year/make/model or VIN, hail-damage answers,
          optional photos, SMS-consent proof (checkbox state, text version, timestamp, IP, user
          agent, page URL), and ad click IDs (utm_*, fbclid, gclid).
        </Section>
        <Section title="How we use it">
          To contact you about a hail inspection you requested, create a Hail Ops customer record,
          and attribute ads. We do not sell mobile numbers. [LEGAL REVIEW: 10DLC “not shared or
          sold” language.]
        </Section>
        <Section title="Text messages">
          SMS is optional. The consent box is unchecked by default. Reply STOP to opt out. Message
          and data rates may apply. We do not text leads in this phase unless a later Hail Ops
          release is enabled and you opted in. [LEGAL REVIEW: SMS terms / HELP / frequency.]
        </Section>
        <Section title="Cookies and ads">
          Landing pages may later load Meta or Google tags. [LEGAL REVIEW: pixel / CAPI disclosure.]
        </Section>
        <Section title="Contact">
          Questions: {BRAND_EMAIL}. [LEGAL REVIEW: mailing address.]
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p>
    </section>
  );
}
