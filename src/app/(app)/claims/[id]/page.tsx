import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ClaimStatusBadge, EstimateStatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney, formatPhone, formatVehicle } from "@/lib/format";
import { cn } from "cn";

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const claim = await prisma.claim.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      estimates: {
        orderBy: { updatedAt: "desc" },
        include: { vehicle: true },
      },
    },
  });
  if (!claim) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        title={claim.claimNumber}
        description={`${claim.customer.name} · ${claim.insuranceCarrier || "Carrier TBD"}`}
      >
        <ClaimStatusBadge status={claim.status} />
        <Link
          href={`/claims/${claim.id}/edit`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Edit
        </Link>
        <Link
          href={`/estimates/new?customerId=${claim.customerId}&claimId=${claim.id}&vehicleId=${claim.vehicleId ?? ""}`}
          className={cn(buttonVariants())}
        >
          New estimate
        </Link>
      </PageHeader>

      <section className="grid gap-4 rounded-xl bg-card p-5 text-sm ring-1 ring-foreground/10 md:grid-cols-2">
        <Info label="Customer" value={claim.customer.name} href={`/customers/${claim.customerId}`} />
        <Info label="Vehicle" value={formatVehicle(claim.vehicle)} />
        <Info label="Date of loss" value={formatDate(claim.dateOfLoss)} />
        <Info label="Deductible" value={formatMoney(claim.deductibleCents)} />
        <Info label="Adjuster" value={claim.adjusterName || "—"} />
        <Info
          label="Adjuster contact"
          value={[formatPhone(claim.adjusterPhone), claim.adjusterEmail].filter(Boolean).join(" · ") || "—"}
        />
        <Info label="Notes" value={claim.notes || "—"} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Linked estimates</h2>
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {claim.estimates.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No estimates attached to this claim yet.
            </p>
          ) : (
            <ul className="divide-y">
              {claim.estimates.map((estimate) => (
                <li key={estimate.id}>
                  <Link
                    href={`/estimates/${estimate.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{estimate.estimateNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatVehicle(estimate.vehicle)}
                      </p>
                    </div>
                    <div className="text-right">
                      <EstimateStatusBadge status={estimate.status} />
                      <p className="mt-1 text-sm">{formatMoney(estimate.totalCents)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Info({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      {href ? (
        <Link href={href} className="mt-1 inline-block underline-offset-4 hover:underline">
          {value}
        </Link>
      ) : (
        <p className="mt-1 whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}
