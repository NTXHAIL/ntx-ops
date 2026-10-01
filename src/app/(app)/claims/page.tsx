import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ClaimStatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney, formatVehicle } from "@/lib/format";

export default async function ClaimsPage() {
  const claims = await prisma.claim.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      customer: true,
      vehicle: true,
      _count: { select: { estimates: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Claims"
        description="Insurance claim files linked to a customer, vehicle, and one or more estimates."
        actionHref="/claims/new"
        actionLabel="New claim"
      />

      {claims.length === 0 ? (
        <EmptyState
          title="No claims yet"
          description="Open a claim when you have a carrier number, then attach hail estimates as you write them."
          actionHref="/claims/new"
          actionLabel="New claim"
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <ul className="divide-y">
            {claims.map((claim) => (
              <li key={claim.id}>
                <Link
                  href={`/claims/${claim.id}`}
                  className="flex flex-col gap-3 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{claim.claimNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {claim.customer.name} · {formatVehicle(claim.vehicle)} ·{" "}
                      {claim.insuranceCarrier || "Carrier TBD"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      DOL {formatDate(claim.dateOfLoss)} · Deductible{" "}
                      {formatMoney(claim.deductibleCents)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {claim._count.estimates} estimate
                      {claim._count.estimates === 1 ? "" : "s"}
                    </span>
                    <ClaimStatusBadge status={claim.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
