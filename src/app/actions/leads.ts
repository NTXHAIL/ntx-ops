"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { text } from "@/lib/form-data";
import { consentProof, leadSubmissionSchema, normalizePhone } from "@/lib/leads";
import { notifyStaffNewLead } from "@/lib/mailer";
import type { LeadStatus } from "@prisma/client";

function clientIp(headerStore: Headers) {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headerStore.get("x-real-ip");
}

async function savePhoto(file: File | null) {
  if (!file || file.size === 0) return null;
  if (file.size > 6 * 1024 * 1024) return null;
  if (!file.type.startsWith("image/")) return null;
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const name = `${randomUUID()}.${ext}`;
  const dir = join(process.cwd(), "public", "lead-photos");
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(dir, name), buffer);
  return `/lead-photos/${name}`;
}

export async function submitStormLeadAction(formData: FormData) {
  const slug = text(formData, "slug");
  const parsed = leadSubmissionSchema.safeParse({
    stormId: text(formData, "stormId"),
    vehicleDamaged: text(formData, "vehicleDamaged"),
    insurance: text(formData, "insurance"),
    vehicleYear: text(formData, "vehicleYear"),
    vehicleMake: text(formData, "vehicleMake"),
    vehicleModel: text(formData, "vehicleModel"),
    vin: text(formData, "vin"),
    zip: text(formData, "zip"),
    name: text(formData, "name"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    preferredContact: text(formData, "preferredContact"),
    smsConsent: formData.get("smsConsent") === "on" || formData.get("smsConsent") === "true",
    utmSource: text(formData, "utm_source"),
    utmMedium: text(formData, "utm_medium"),
    utmCampaign: text(formData, "utm_campaign"),
    utmTerm: text(formData, "utm_term"),
    utmContent: text(formData, "utm_content"),
    fbclid: text(formData, "fbclid"),
    gclid: text(formData, "gclid"),
    pageUrl: text(formData, "pageUrl"),
  });

  if (!parsed.success) {
    redirect(`/storm/${slug}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const data = parsed.data;
  const storm = await prisma.storm.findUnique({ where: { id: data.stormId } });
  if (!storm || (storm.status !== "APPROVED" && storm.status !== "ACTIVE")) {
    redirect(`/storm/${slug}?error=${encodeURIComponent("This storm page is not accepting leads.")}`);
  }

  const phone = normalizePhone(data.phone);
  if (phone.length < 10) {
    redirect(`/storm/${slug}?error=${encodeURIComponent("Enter a 10-digit mobile number.")}`);
  }

  const headerStore = await headers();
  const empty = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  let customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { phonePrimary: phone },
        ...(data.email ? [{ emailPrimary: data.email.trim().toLowerCase() }] : []),
      ],
    },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: data.name.trim(),
        phonePrimary: phone,
        emailPrimary: empty(data.email?.toLowerCase()),
        zip: data.zip,
        notes: `Storm lead · ${storm.name}`,
      },
    });
  }

  if (data.vehicleYear || data.vehicleMake || data.vehicleModel || data.vin) {
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        customerId: customer.id,
        vin: empty(data.vin) ?? undefined,
        year: empty(data.vehicleYear) ?? undefined,
        make: empty(data.vehicleMake) ?? undefined,
        model: empty(data.vehicleModel) ?? undefined,
      },
    });
    if (!existingVehicle) {
      await prisma.vehicle.create({
        data: {
          customerId: customer.id,
          year: empty(data.vehicleYear),
          make: empty(data.vehicleMake),
          model: empty(data.vehicleModel),
          vin: empty(data.vin),
        },
      });
    }
  }

  const photo = formData.get("photo");
  const photoPath = await savePhoto(photo instanceof File ? photo : null);
  const proof = consentProof({
    smsConsent: data.smsConsent,
    pageUrl: data.pageUrl,
    ip: clientIp(headerStore),
    userAgent: headerStore.get("user-agent"),
  });

  await prisma.lead.create({
    data: {
      stormId: storm.id,
      customerId: customer.id,
      vehicleDamaged: data.vehicleDamaged === "yes",
      insurance: data.insurance,
      vehicleYear: empty(data.vehicleYear),
      vehicleMake: empty(data.vehicleMake),
      vehicleModel: empty(data.vehicleModel),
      vin: empty(data.vin),
      zip: data.zip,
      name: data.name.trim(),
      phone,
      email: empty(data.email?.toLowerCase()),
      preferredContact: data.preferredContact,
      photoPath,
      utmSource: empty(data.utmSource),
      utmMedium: empty(data.utmMedium),
      utmCampaign: empty(data.utmCampaign),
      utmTerm: empty(data.utmTerm),
      utmContent: empty(data.utmContent),
      fbclid: empty(data.fbclid),
      gclid: empty(data.gclid),
      ...proof,
    },
  });

  await notifyStaffNewLead({
    stormName: storm.name,
    name: data.name.trim(),
    phone,
    zip: data.zip,
    landingUrl: data.pageUrl || `/storm/${storm.slug}`,
  });

  revalidatePath("/leads");
  revalidatePath("/customers");
  redirect(`/storm/${storm.slug}?thanks=1`);
}

export async function updateLeadStatusAction(formData: FormData) {
  await requireUser();
  const id = text(formData, "id");
  const status = text(formData, "status") as LeadStatus;
  await prisma.lead.update({ where: { id }, data: { status } });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}
