import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EstimateStatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney, formatVehicle } from "@/lib/format";
import { cn } from "cn";

export default async function DashboardPage() {
  const user = await requireUser();
  const [drafts, pending, approved, openClaims, newLeads, recentEstimates, recentClaims] =
    await Promise.all([
      prisma.estimate.count({ where: { status: "DRAFT" } }),
      prisma.estimate.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.estimate.count({ where: { status: "APPROVED" } }),
      prisma.claim.count({ where: { status: { not: "CLOSED" } } }),
      prisma.lead.count({ where: { status: "NEW" } }),
      prisma.estimate.findMany({
        take: 6,
        orderBy: { updatedAt: "desc" },
        include: { customer: true, vehicle: true },
      }),
      prisma.claim.findMany({
        take: 4,
        orderBy: { updatedAt: "desc" },
        include: { customer: true, vehicle: true },
      }),
    ]);

  return (
    <div>
      <PageHeader
        title={`Good to see you, ${user.name.split(" ")[0]}`}
        description="Write hail estimates, keep claims attached, and send a clean sheet to the adjuster."
        actionHref="/estimates/new"
        actionLabel="New estimate"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="New storm leads" value={newLeads} href="/leads?status=NEW" />
        <Stat label="Draft estimates" value={drafts} href="/estimates?status=DRAFT" />
        <Stat
          label="Pending approval"
          value={pending}
          href="/estimates?status=PENDING_APPROVAL"
        />
        <Stat label="Approved" value={approved} href="/estimates?status=APPROVED" />
        <Stat label="Open claims" value={openClaims} href="/claims" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent estimates</h2>
            <Link href="/estimates" className="text-sm text-primary underline-offset-4 hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {recentEstimates.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                No estimates yet.
              </p>
            ) : (
              <ul className="divide-y">
                {recentEstimates.map((estimate) => (
                  <li key={estimate.id}>
                    <Link
                      href={`/estimates/${estimate.id}`}
                      className="flex flex-col gap-2 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{estimate.estimateNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {estimate.customer.name} · {formatVehicle(estimate.vehicle)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <EstimateStatusBadge status={estimate.status} />
                        <span className="text-sm font-medium">
                          {formatMoney(estimate.totalCents)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Claims</h2>
            <Link href="/claims/new" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              New claim
            </Link>
          </div>
          <div className="space-y-3">
            {recentClaims.map((claim) => (
              <Link
                key={claim.id}
                href={`/claims/${claim.id}`}
                className="block rounded-xl bg-card p-4 ring-1 ring-foreground/10 hover:bg-muted/40"
              >
                <p className="font-medium">{claim.claimNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {claim.insuranceCarrier || "Carrier TBD"} · {claim.customer.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  DOL {formatDate(claim.dateOfLoss)}
                </p>
              </Link>
            ))}
            <Link
              href="/customers/new"
              className="block rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground hover:bg-card"
            >
              Add a customer
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 hover:bg-muted/40"
    >
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Link>
  );
}
