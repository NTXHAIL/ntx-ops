import { saveCustomerAction } from "@/app/actions/customers";
import { VinDecodeFields } from "@/components/vin-decode-field";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "cn";
import type { Customer } from "@prisma/client";

export function CustomerForm({
  customer,
  error,
  includeVehicle,
}: {
  customer?: Customer;
  error?: string;
  includeVehicle?: boolean;
}) {
  return (
    <form action={saveCustomerAction} className="space-y-6">
      {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" className="sm:col-span-2">
          <Input id="name" name="name" required defaultValue={customer?.name} />
        </Field>
        <Field label="Primary phone" htmlFor="phonePrimary">
          <Input
            id="phonePrimary"
            name="phonePrimary"
            defaultValue={customer?.phonePrimary ?? ""}
          />
        </Field>
        <Field label="Secondary phone" htmlFor="phoneSecondary">
          <Input
            id="phoneSecondary"
            name="phoneSecondary"
            defaultValue={customer?.phoneSecondary ?? ""}
          />
        </Field>
        <Field label="Primary email" htmlFor="emailPrimary">
          <Input
            id="emailPrimary"
            name="emailPrimary"
            type="email"
            defaultValue={customer?.emailPrimary ?? ""}
          />
        </Field>
        <Field label="Secondary email" htmlFor="emailSecondary">
          <Input
            id="emailSecondary"
            name="emailSecondary"
            type="email"
            defaultValue={customer?.emailSecondary ?? ""}
          />
        </Field>
        <Field label="Street" htmlFor="street" className="sm:col-span-2">
          <Input id="street" name="street" defaultValue={customer?.street ?? ""} />
        </Field>
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" defaultValue={customer?.city ?? ""} />
        </Field>
        <Field label="State" htmlFor="state">
          <Input id="state" name="state" defaultValue={customer?.state ?? ""} />
        </Field>
        <Field label="ZIP" htmlFor="zip">
          <Input id="zip" name="zip" defaultValue={customer?.zip ?? ""} />
        </Field>
        <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
          <Textarea id="notes" name="notes" rows={4} defaultValue={customer?.notes ?? ""} />
        </Field>
      </section>

      {includeVehicle ? (
        <section className="grid gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="text-sm font-semibold">First vehicle (optional)</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Decode a VIN with NHTSA vPIC, then edit year / make / model if needed.
            </p>
            <VinDecodeFields
              names={{
                vin: "vehicleVin",
                year: "vehicleYear",
                make: "vehicleMake",
                model: "vehicleModel",
                bodyClass: "vehicleBodyClass",
              }}
            />
          </div>
          <Field label="Color" htmlFor="vehicleColor">
            <Input id="vehicleColor" name="vehicleColor" />
          </Field>
        </section>
      ) : null}

      <button type="submit" className={cn(buttonVariants())}>
        {customer ? "Save customer" : "Create customer"}
      </button>
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
