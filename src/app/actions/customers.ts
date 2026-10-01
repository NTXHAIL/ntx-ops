"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emptyToNull, text } from "@/lib/form-data";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phonePrimary: z.string(),
  phoneSecondary: z.string(),
  emailPrimary: z.string(),
  emailSecondary: z.string(),
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  notes: z.string(),
});

const vehicleSchema = z.object({
  year: z.string(),
  make: z.string(),
  model: z.string(),
  vin: z.string(),
  bodyClass: z.string(),
  color: z.string(),
  notes: z.string(),
});

export async function saveCustomerAction(formData: FormData) {
  await requireUser();
  const id = text(formData, "id");
  const parsed = customerSchema.safeParse({
    name: text(formData, "name"),
    phonePrimary: text(formData, "phonePrimary"),
    phoneSecondary: text(formData, "phoneSecondary"),
    emailPrimary: text(formData, "emailPrimary"),
    emailSecondary: text(formData, "emailSecondary"),
    street: text(formData, "street"),
    city: text(formData, "city"),
    state: text(formData, "state"),
    zip: text(formData, "zip"),
    notes: text(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(
      id
        ? `/customers/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`
        : `/customers/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const data = {
    name: parsed.data.name,
    phonePrimary: emptyToNull(parsed.data.phonePrimary),
    phoneSecondary: emptyToNull(parsed.data.phoneSecondary),
    emailPrimary: emptyToNull(parsed.data.emailPrimary),
    emailSecondary: emptyToNull(parsed.data.emailSecondary),
    street: emptyToNull(parsed.data.street),
    city: emptyToNull(parsed.data.city),
    state: emptyToNull(parsed.data.state),
    zip: emptyToNull(parsed.data.zip),
    notes: emptyToNull(parsed.data.notes),
  };

  const customer = id
    ? await prisma.customer.update({ where: { id }, data })
    : await prisma.customer.create({ data });

  const year = text(formData, "vehicleYear").trim();
  const make = text(formData, "vehicleMake").trim();
  const model = text(formData, "vehicleModel").trim();
  const vin = text(formData, "vehicleVin").trim();
  if (!id && (year || make || model || vin)) {
    await prisma.vehicle.create({
      data: {
        customerId: customer.id,
        year: emptyToNull(year),
        make: emptyToNull(make),
        model: emptyToNull(model),
        vin: emptyToNull(vin),
        bodyClass: emptyToNull(text(formData, "vehicleBodyClass")),
        color: emptyToNull(text(formData, "vehicleColor")),
      },
    });
  }

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function saveVehicleAction(formData: FormData) {
  await requireUser();
  const customerId = text(formData, "customerId");
  const id = text(formData, "id");
  const parsed = vehicleSchema.safeParse({
    year: text(formData, "year"),
    make: text(formData, "make"),
    model: text(formData, "model"),
    vin: text(formData, "vin"),
    bodyClass: text(formData, "bodyClass"),
    color: text(formData, "color"),
    notes: text(formData, "notes"),
  });
  if (!parsed.success || !customerId) {
    redirect(
      customerId
        ? `/customers/${customerId}?error=${encodeURIComponent("Could not save that vehicle.")}`
        : "/customers",
    );
  }

  const data = {
    customerId,
    year: emptyToNull(parsed.data.year),
    make: emptyToNull(parsed.data.make),
    model: emptyToNull(parsed.data.model),
    vin: emptyToNull(parsed.data.vin),
    bodyClass: emptyToNull(parsed.data.bodyClass),
    color: emptyToNull(parsed.data.color),
    notes: emptyToNull(parsed.data.notes),
  };

  if (id) {
    await prisma.vehicle.update({ where: { id }, data });
  } else {
    await prisma.vehicle.create({ data });
  }

  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function deleteVehicleAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") || "");
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) return;
  await prisma.vehicle.delete({ where: { id } });
  revalidatePath(`/customers/${vehicle.customerId}`);
}
