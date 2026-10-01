import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { LeadStatusBadge } from "@/components/status-badge";
import { NativeSelect } from "@/components/ui/native-select";
import { requireUser } from "@/lib/auth";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDate, formatPhone } from "@/lib/format";
import type { LeadStatus } from "@prisma/client";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ storm?: string; status?: string }>;
}) {
  await requireUser();
  const { storm, status } = await searchParams;
  const storms = await prisma.storm.findMany({ orderBy: { occurredOn: "desc" } });
  const leads = await prisma.lead.findMany({
    where: {
      ...(storm ? { stormId: storm } : {}),
      ...(status ? { status: status as LeadStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { storm: true, customer: true },
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Storm landing-page submissions. Contact from here — Hail Ops does not text or email the customer yet."
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <NativeSelect name="storm" defaultValue={storm ?? ""} className="h-11 min-w-0 flex-1 sm:w-56 sm:flex-none">
          <option value="">All storms</option>
          {storms.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={status ?? ""} className="h-11 min-w-0 flex-1 sm:w-40 sm:flex-none">
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((item) => (
            <option key={item} value={item}>
              {LEAD_STATUS_LABELS[item]}
            </option>
          ))}
        </NativeSelect>
        <button type="submit" className="h-11 min-w-20 rounded-lg border border-input px-3 text-sm font-semibold">
          Filter
        </button>
      </form>

      {leads.length === 0 ? (
        <EmptyState
          title="No leads match"
          description="Approve a storm, open its landing page, and submit the survey to see a lead here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <ul className="divide-y">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex flex-col gap-2 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPhone(lead.phone)} · {lead.zip} · {lead.storm.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(lead.createdAt)}
                      {lead.utmSource ? ` · ${lead.utmSource}` : ""}
                      {lead.smsConsent ? " · SMS consent" : ""}
                    </p>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
