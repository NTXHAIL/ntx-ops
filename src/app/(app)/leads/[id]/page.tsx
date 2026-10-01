import Link from "next/link";
import { notFound } from "next/navigation";
import { updateLeadStatusAction } from "@/app/actions/leads";
import { PageHeader } from "@/components/page-header";
import { LeadStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { requireUser } from "@/lib/auth";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDate, formatPhone } from "@/lib/format";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { storm: true, customer: true },
  });
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={lead.name} description={`${lead.storm.name} · ${formatDate(lead.createdAt)}`}>
        <LeadStatusBadge status={lead.status} />
      </PageHeader>

      <form action={updateLeadStatusAction} className="mb-6 flex gap-2">
        <input type="hidden" name="id" value={lead.id} />
        <NativeSelect name="status" defaultValue={lead.status} className="h-10">
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {LEAD_STATUS_LABELS[status]}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit">Update status</Button>
      </form>

      <dl className="grid gap-3 sm:grid-cols-2">
        <Fact label="Phone" value={formatPhone(lead.phone)} />
        <Fact label="Email" value={lead.email || "—"} />
        <Fact label="ZIP" value={lead.zip} />
        <Fact label="Preferred" value={lead.preferredContact} />
        <Fact label="Hail damage" value={lead.vehicleDamaged ? "Yes" : "No / not sure"} />
        <Fact label="Comprehensive" value={lead.insurance.replace("_", " ")} />
        <Fact
          label="Vehicle"
          value={[lead.vehicleYear, lead.vehicleMake, lead.vehicleModel].filter(Boolean).join(" ") || "—"}
        />
        <Fact label="VIN" value={lead.vin || "—"} />
        <Fact label="Customer" value={lead.customer.name} href={`/customers/${lead.customerId}`} />
        <Fact label="Storm" value={lead.storm.name} href={`/storms/${lead.stormId}`} />
      </dl>

      <section className="mt-8 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-semibold">Attribution</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Fact label="utm_source" value={lead.utmSource} />
          <Fact label="utm_medium" value={lead.utmMedium} />
          <Fact label="utm_campaign" value={lead.utmCampaign} />
          <Fact label="utm_term" value={lead.utmTerm} />
          <Fact label="utm_content" value={lead.utmContent} />
          <Fact label="fbclid" value={lead.fbclid} />
          <Fact label="gclid" value={lead.gclid} />
        </dl>
      </section>

      <section className="mt-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-semibold">SMS consent proof</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <Fact label="Checked" value={lead.smsConsent ? "Yes" : "No"} />
          <Fact label="Version" value={lead.consentTextVersion} />
          <Fact label="When" value={lead.consentAt ? lead.consentAt.toISOString() : "—"} />
          <Fact label="IP" value={lead.consentIp} />
          <Fact label="Page" value={lead.consentPageUrl} />
          <Fact label="User agent" value={lead.consentUserAgent} />
        </dl>
        {lead.consentText ? (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
            {lead.consentText}
          </p>
        ) : null}
      </section>

      {lead.photoPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={lead.photoPath} alt="Uploaded damage" className="mt-4 max-h-72 rounded-xl object-cover" />
      ) : null}
    </div>
  );
}

function Fact({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | null;
  href?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm">
        {href ? (
          <Link href={href} className="text-[#2563eb] underline-offset-2 hover:underline">
            {value || "—"}
          </Link>
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}
