import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { EstimateStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ESTIMATE_STATUS_LABELS, ESTIMATE_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney, formatVehicle } from "@/lib/format";
import type { EstimateStatus } from "@prisma/client";

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const selected = ESTIMATE_STATUSES.includes(status as EstimateStatus)
    ? (status as EstimateStatus)
    : undefined;

  const estimates = await prisma.estimate.findMany({
    where: selected ? { status: selected } : undefined,
    orderBy: { updatedAt: "desc" },
    include: { customer: true, vehicle: true, claim: true },
  });

  return (
    <div>
      <PageHeader
        title="Estimates"
        description="Walk the overhead map, price PDR / conventional / R&R per panel, then send for approval."
        actionHref="/estimates/new"
        actionLabel="New estimate"
      />

      <form className="mb-4 flex max-w-md items-center gap-2">
        <NativeSelect name="status" defaultValue={selected ?? ""}>
          <option value="">All statuses</option>
          {ESTIMATE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ESTIMATE_STATUS_LABELS[value]}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {estimates.length === 0 ? (
        <EmptyState
          title="No estimates in this view"
          description="Create a draft, price the panels from the shop matrix, then send it for approval."
          actionHref="/estimates/new"
          actionLabel="New estimate"
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <ul className="divide-y">
            {estimates.map((estimate) => (
              <li key={estimate.id}>
                <Link
                  href={`/estimates/${estimate.id}`}
                  className="flex flex-col gap-3 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{estimate.estimateNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {estimate.customer.name} · {formatVehicle(estimate.vehicle)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated {formatDate(estimate.updatedAt)}
                      {estimate.claim ? ` · Claim ${estimate.claim.claimNumber}` : ""}
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
        </div>
      )}
    </div>
  );
}
