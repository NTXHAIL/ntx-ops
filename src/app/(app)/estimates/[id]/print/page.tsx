import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { BRAND_EMAIL, BRAND_NAME, BRAND_PHONE, LEGAL_NAME, PRODUCT_NAME } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney, formatPhone, formatVehicle } from "@/lib/format";

export default async function EstimatePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      claim: true,
      createdBy: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!estimate) notFound();

  const address = [
    estimate.customer.street,
    [estimate.customer.city, estimate.customer.state, estimate.customer.zip]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-3xl print:max-w-none">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          Use your browser print dialog to save a PDF.
        </p>
        <PrintButton />
      </div>

      <article className="print-sheet rounded-xl bg-white p-8 text-zinc-900 ring-1 ring-zinc-200 print:rounded-none print:p-0 print:ring-0">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-zinc-500 uppercase">
              {BRAND_NAME}
            </p>
            <h1 className="text-2xl font-semibold">{PRODUCT_NAME} estimate</h1>
            <p className="mt-1 text-sm text-zinc-600">{LEGAL_NAME}</p>
            <p className="text-sm text-zinc-600">
              {formatPhone(BRAND_PHONE)} · {BRAND_EMAIL}
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="text-lg font-semibold">{estimate.estimateNumber}</p>
            <p>Status: {estimate.status.replaceAll("_", " ")}</p>
            <p>Date: {formatDate(estimate.createdAt)}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-zinc-200 py-6 text-sm sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Customer
            </h2>
            <p className="mt-1 font-medium">{estimate.customer.name}</p>
            <p>{formatPhone(estimate.customer.phonePrimary)}</p>
            <p>{estimate.customer.emailPrimary}</p>
            <p>{address}</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Vehicle / claim
            </h2>
            <p className="mt-1 font-medium">{formatVehicle(estimate.vehicle)}</p>
            <p>VIN {estimate.vehicle?.vin || "not recorded"}</p>
            {estimate.vehicle?.bodyClass ? <p>{estimate.vehicle.bodyClass}</p> : null}
            <p>
              Claim {estimate.claim?.claimNumber || "—"}
              {estimate.claim?.insuranceCarrier
                ? ` · ${estimate.claim.insuranceCarrier}`
                : ""}
            </p>
            {estimate.claim ? (
              <p>Deductible {formatMoney(estimate.claim.deductibleCents)}</p>
            ) : null}
          </div>
        </section>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs tracking-wide text-zinc-500 uppercase">
              <th className="py-2 pr-3">Description</th>
              <th className="py-2 pr-3">Detail</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lineItems.map((item) => (
              <tr key={item.id} className="border-b border-zinc-100 align-top">
                <td className="py-2 pr-3 font-medium">{item.description}</td>
                <td className="py-2 pr-3 text-zinc-600">{item.auditNote || "—"}</td>
                <td className="py-2 text-right">{formatMoney(item.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-6 ml-auto w-full max-w-xs space-y-1 text-sm">
          <Row label="PDR subtotal" value={estimate.pdrSubtotalCents} />
          <Row label="Panel markups" value={estimate.markupCents} />
          <Row label="Oversized dents" value={estimate.oversizedCents} />
          <Row label="Labor / R&I" value={estimate.laborCents} />
          <Row label="Conventional" value={estimate.conventionalCents} />
          <Row label="Replacement / R&R" value={estimate.replaceCents} />
          <Row label="Other" value={estimate.customCents} />
          <div className="flex justify-between border-t border-zinc-300 pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(estimate.totalCents)}</span>
          </div>
        </section>

        {estimate.notes ? (
          <section className="mt-8 text-sm">
            <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Notes
            </h2>
            <p className="mt-1 whitespace-pre-wrap">{estimate.notes}</p>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-zinc-200 pt-4 text-xs text-zinc-500">
          Prepared by {estimate.createdBy.name} in {PRODUCT_NAME}. Matrix prices and
          markups are {BRAND_NAME} shop settings, not a carrier-published schedule.
          This is an estimate, not an invoice.
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{formatMoney(value)}</span>
    </div>
  );
}
