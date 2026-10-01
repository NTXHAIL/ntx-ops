import Link from "next/link";
import { notFound } from "next/navigation";
import { updateEstimateStatusAction } from "@/app/actions/estimates";
import { PageHeader } from "@/components/page-header";
import { EstimateStatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nextStatusOptions } from "@/lib/queries";
import { BODY_STYLE_LABELS, isBodyStyle } from "@/lib/body-styles";
import { fieldLabelMap, groupDraftPhotos } from "@/lib/estimate-photos";
import { ESTIMATE_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatMoney, formatVehicle } from "@/lib/format";
import { cn } from "cn";

export default async function EstimateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      claim: true,
      createdBy: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      photoFields: true,
    },
  });
  if (!estimate) notFound();

  const next = nextStatusOptions(estimate.status);
  const bodyStyle = isBodyStyle(estimate.bodyStyle) ? estimate.bodyStyle : "CAR";
  const photoGroups = groupDraftPhotos(
    estimate.photos,
    fieldLabelMap(estimate.photoFields),
    bodyStyle,
  ).filter((group) => group.photos.length > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={estimate.estimateNumber}
        description={`${estimate.customer.name} · ${formatVehicle(estimate.vehicle)}`}
      >
        <EstimateStatusBadge status={estimate.status} />
        {estimate.status === "DRAFT" ? (
          <Link
            href={`/estimates/${estimate.id}/edit`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Edit
          </Link>
        ) : null}
        <Link
          href={`/estimates/${estimate.id}/print`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Print / PDF
        </Link>
      </PageHeader>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-xl bg-card p-5 text-sm ring-1 ring-foreground/10 sm:grid-cols-2">
        <Info label="Customer" value={estimate.customer.name} href={`/customers/${estimate.customerId}`} />
        <Info label="Vehicle" value={formatVehicle(estimate.vehicle)} />
        <Info
          label="Body style"
          value={
            isBodyStyle(estimate.bodyStyle)
              ? BODY_STYLE_LABELS[estimate.bodyStyle]
              : estimate.bodyStyle
          }
        />
        <Info
          label="Claim"
          value={estimate.claim?.claimNumber || "Not linked"}
          href={estimate.claim ? `/claims/${estimate.claim.id}` : undefined}
        />
        <Info label="Written by" value={`${estimate.createdBy.name} · ${formatDate(estimate.createdAt)}`} />
        <Info label="Notes" value={estimate.notes || "—"} />
      </section>

      {next.length > 0 ? (
        <section className="flex flex-wrap gap-2">
          {next.map((status) => {
            const needsAdmin = status === "APPROVED" || status === "DECLINED";
            if (needsAdmin && user.role !== "ADMIN") return null;
            return (
              <form key={status} action={updateEstimateStatusAction}>
                <input type="hidden" name="id" value={estimate.id} />
                <input type="hidden" name="status" value={status} />
                <Button
                  type="submit"
                  variant={status === "DECLINED" ? "destructive" : "outline"}
                >
                  Mark {ESTIMATE_STATUS_LABELS[status].toLowerCase()}
                </Button>
              </form>
            );
          })}
        </section>
      ) : null}

      <section className="table-scroll overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Line</th>
              <th className="px-4 py-2 font-medium">Audit</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lineItems.map((item) => (
              <tr key={item.id} className="border-b last:border-0 align-top">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.type.replaceAll("_", " ")}</p>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {item.auditNote || "—"}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatMoney(item.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {photoGroups.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Photos</h2>
          {photoGroups.map((group) => (
            <div key={group.key}>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group.label}
              </p>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {group.photos.map((photo) => (
                  <li key={photo.id} className="min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.path}
                      alt={photo.label || group.label}
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                    {photo.label ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{photo.label}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      <section className="grid gap-2 rounded-xl bg-[var(--nav)] p-5 text-white sm:grid-cols-3">
        <Total label="PDR subtotal" value={estimate.pdrSubtotalCents} />
        <Total label="Markups" value={estimate.markupCents} />
        <Total label="OS" value={estimate.oversizedCents} />
        <Total label="R&I labor" value={estimate.laborCents} />
        <Total label="Conventional" value={estimate.conventionalCents} />
        <Total label="R&R" value={estimate.replaceCents} />
        <Total label="Other" value={estimate.customCents} />
        <Total label="Total" value={estimate.totalCents} emphasize />
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

function Total({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] tracking-wide text-white/60 uppercase">{label}</p>
      <p className={emphasize ? "text-xl font-semibold" : "text-sm font-medium"}>
        {formatMoney(value)}
      </p>
    </div>
  );
}
