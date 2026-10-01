import type { Customer, Vehicle } from "@prisma/client";
import { saveClaimAction } from "@/app/actions/claims";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS } from "@/lib/constants";
import { centsToDollarsInput, formatVehicle } from "@/lib/format";

type ClaimValues = {
  id?: string;
  claimNumber?: string;
  insuranceCarrier?: string | null;
  adjusterName?: string | null;
  adjusterPhone?: string | null;
  adjusterEmail?: string | null;
  deductibleCents?: number;
  dateOfLoss?: Date | null;
  status?: string;
  notes?: string | null;
  customerId?: string;
  vehicleId?: string | null;
};

export function ClaimForm({
  claim,
  customers,
  error,
}: {
  claim?: ClaimValues;
  customers: (Customer & { vehicles: Vehicle[] })[];
  error?: string;
}) {
  const dateValue = claim?.dateOfLoss
    ? new Date(claim.dateOfLoss).toISOString().slice(0, 10)
    : "";

  return (
    <form action={saveClaimAction} className="space-y-6">
      {claim?.id ? <input type="hidden" name="id" value={claim.id} /> : null}
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:grid-cols-2">
        <Field label="Claim number" htmlFor="claimNumber">
          <Input
            id="claimNumber"
            name="claimNumber"
            required
            defaultValue={claim?.claimNumber}
          />
        </Field>
        <Field label="Insurance carrier" htmlFor="insuranceCarrier">
          <Input
            id="insuranceCarrier"
            name="insuranceCarrier"
            defaultValue={claim?.insuranceCarrier ?? ""}
          />
        </Field>
        <Field label="Customer" htmlFor="customerId">
          <NativeSelect id="customerId" name="customerId" required defaultValue={claim?.customerId}>
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Vehicle" htmlFor="vehicleId">
          <NativeSelect id="vehicleId" name="vehicleId" defaultValue={claim?.vehicleId ?? ""}>
            <option value="">No vehicle</option>
            {customers.flatMap((customer) =>
              customer.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {customer.name} · {formatVehicle(vehicle)}
                </option>
              )),
            )}
          </NativeSelect>
        </Field>
        <Field label="Status" htmlFor="status">
          <NativeSelect id="status" name="status" defaultValue={claim?.status ?? "OPEN"}>
            {CLAIM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CLAIM_STATUS_LABELS[status]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Date of loss" htmlFor="dateOfLoss">
          <Input id="dateOfLoss" name="dateOfLoss" type="date" defaultValue={dateValue} />
        </Field>
        <Field label="Deductible" htmlFor="deductible">
          <Input
            id="deductible"
            name="deductible"
            defaultValue={centsToDollarsInput(claim?.deductibleCents ?? 0)}
          />
        </Field>
        <Field label="Adjuster name" htmlFor="adjusterName">
          <Input
            id="adjusterName"
            name="adjusterName"
            defaultValue={claim?.adjusterName ?? ""}
          />
        </Field>
        <Field label="Adjuster phone" htmlFor="adjusterPhone">
          <Input
            id="adjusterPhone"
            name="adjusterPhone"
            defaultValue={claim?.adjusterPhone ?? ""}
          />
        </Field>
        <Field label="Adjuster email" htmlFor="adjusterEmail">
          <Input
            id="adjusterEmail"
            name="adjusterEmail"
            type="email"
            defaultValue={claim?.adjusterEmail ?? ""}
          />
        </Field>
        <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
          <Textarea id="notes" name="notes" rows={4} defaultValue={claim?.notes ?? ""} />
        </Field>
      </section>

      <Button type="submit">{claim?.id ? "Save claim" : "Create claim"}</Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5">
        {label}
      </Label>
      {children}
    </div>
  );
}
