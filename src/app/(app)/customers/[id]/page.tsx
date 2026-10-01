import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteVehicleAction, saveVehicleAction } from "@/app/actions/customers";
import { PageHeader } from "@/components/page-header";
import { EstimateStatusBadge, ClaimStatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VinDecodeFields } from "@/components/vin-decode-field";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney, formatPhone, formatVehicle } from "@/lib/format";
import { cn } from "cn";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      vehicles: { orderBy: { createdAt: "asc" } },
      estimates: {
        orderBy: { updatedAt: "desc" },
        include: { vehicle: true },
      },
      claims: {
        orderBy: { updatedAt: "desc" },
        include: { vehicle: true },
      },
    },
  });
  if (!customer) notFound();

  const address = [customer.street, customer.city, customer.state, customer.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-8">
      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <PageHeader title={customer.name} description="Customer file">
        <Link
          href={`/customers/${customer.id}/edit`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Edit
        </Link>
        <Link
          href={`/estimates/new?customerId=${customer.id}`}
          className={cn(buttonVariants())}
        >
          New estimate
        </Link>
      </PageHeader>

      <section className="grid gap-4 rounded-xl bg-card p-5 text-sm ring-1 ring-foreground/10 md:grid-cols-2">
        <Info label="Primary phone" value={formatPhone(customer.phonePrimary) || "—"} />
        <Info label="Secondary phone" value={formatPhone(customer.phoneSecondary) || "—"} />
        <Info label="Primary email" value={customer.emailPrimary || "—"} />
        <Info label="Secondary email" value={customer.emailSecondary || "—"} />
        <Info label="Address" value={address || "—"} />
        <Info label="Notes" value={customer.notes || "—"} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Vehicles</h2>
        <div className="space-y-3">
          {customer.vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vehicles on this file.</p>
          ) : (
            customer.vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{formatVehicle(vehicle)}</p>
                  <p className="text-sm text-muted-foreground">
                    VIN {vehicle.vin || "not recorded"}
                    {vehicle.bodyClass ? ` · ${vehicle.bodyClass}` : ""}
                    {vehicle.color ? ` · ${vehicle.color}` : ""}
                  </p>
                </div>
                <form action={deleteVehicleAction}>
                  <input type="hidden" name="id" value={vehicle.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              </div>
            ))
          )}
        </div>

        <form
          action={saveVehicleAction}
          className="mt-4 grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-3"
        >
          <input type="hidden" name="customerId" value={customer.id} />
          <p className="text-sm font-medium sm:col-span-3">Add vehicle</p>
          <div className="sm:col-span-3">
            <VinDecodeFields
              names={{
                vin: "vin",
                year: "year",
                make: "make",
                model: "model",
                bodyClass: "bodyClass",
              }}
            />
          </div>
          <div>
            <Label className="mb-1">Color</Label>
            <Input name="color" />
          </div>
          <div className="flex items-end">
            <button type="submit" className={cn(buttonVariants())}>
              Add vehicle
            </button>
          </div>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold">Estimates</h2>
          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {customer.estimates.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="divide-y">
                {customer.estimates.map((estimate) => (
                  <li key={estimate.id}>
                    <Link
                      href={`/estimates/${estimate.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{estimate.estimateNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatVehicle(estimate.vehicle)} · {formatDate(estimate.updatedAt)}
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
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Claims</h2>
            <Link
              href={`/claims/new?customerId=${customer.id}`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              New claim
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {customer.claims.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="divide-y">
                {customer.claims.map((claim) => (
                  <li key={claim.id}>
                    <Link
                      href={`/claims/${claim.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{claim.claimNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {claim.insuranceCarrier || "Carrier TBD"}
                        </p>
                      </div>
                      <ClaimStatusBadge status={claim.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  );
}
