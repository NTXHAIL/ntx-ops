"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dollarsToCents } from "@/lib/format";
import { CLAIM_STATUSES } from "@/lib/constants";
import { emptyToNull, text } from "@/lib/form-data";

const claimSchema = z.object({
  claimNumber: z.string().trim().min(1, "Claim number is required"),
  insuranceCarrier: z.string(),
  adjusterName: z.string(),
  adjusterPhone: z.string(),
  adjusterEmail: z.string(),
  deductible: z.string(),
  dateOfLoss: z.string(),
  status: z.enum(CLAIM_STATUSES),
  notes: z.string(),
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string(),
});

export async function saveClaimAction(formData: FormData) {
  await requireUser();
  const id = text(formData, "id");
  const parsed = claimSchema.safeParse({
    claimNumber: text(formData, "claimNumber"),
    insuranceCarrier: text(formData, "insuranceCarrier"),
    adjusterName: text(formData, "adjusterName"),
    adjusterPhone: text(formData, "adjusterPhone"),
    adjusterEmail: text(formData, "adjusterEmail"),
    deductible: text(formData, "deductible"),
    dateOfLoss: text(formData, "dateOfLoss"),
    status: text(formData, "status") || "OPEN",
    notes: text(formData, "notes"),
    customerId: text(formData, "customerId"),
    vehicleId: text(formData, "vehicleId"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Check the claim fields.";
    redirect(
      id
        ? `/claims/${id}/edit?error=${encodeURIComponent(message)}`
        : `/claims/new?error=${encodeURIComponent(message)}`,
    );
  }

  const data = {
    claimNumber: parsed.data.claimNumber,
    insuranceCarrier: emptyToNull(parsed.data.insuranceCarrier),
    adjusterName: emptyToNull(parsed.data.adjusterName),
    adjusterPhone: emptyToNull(parsed.data.adjusterPhone),
    adjusterEmail: emptyToNull(parsed.data.adjusterEmail),
    deductibleCents: dollarsToCents(parsed.data.deductible || "0"),
    dateOfLoss: parsed.data.dateOfLoss
      ? new Date(`${parsed.data.dateOfLoss}T12:00:00`)
      : null,
    status: parsed.data.status,
    notes: emptyToNull(parsed.data.notes),
    customerId: parsed.data.customerId,
    vehicleId: emptyToNull(parsed.data.vehicleId),
  };

  const claim = id
    ? await prisma.claim.update({ where: { id }, data })
    : await prisma.claim.create({ data });

  revalidatePath("/claims");
  redirect(`/claims/${claim.id}`);
}
