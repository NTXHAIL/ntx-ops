"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dollarsToCents } from "@/lib/format";

export async function saveShopDefaultsAction(formData: FormData) {
  await requireAdmin();
  await prisma.shopSettings.upsert({
    where: { id: "default" },
    update: {
      maxCombinedMarkupPercent: Number(formData.get("maxCombinedMarkupPercent") || 50),
      oversizedOsCents: dollarsToCents(String(formData.get("oversizedOs") || "50")),
      oversizedDosCents: dollarsToCents(String(formData.get("oversizedDos") || "100")),
      oversizedTripleCents: dollarsToCents(String(formData.get("oversizedTriple") || "150")),
    },
    create: {
      id: "default",
      maxCombinedMarkupPercent: Number(formData.get("maxCombinedMarkupPercent") || 50),
      oversizedOsCents: dollarsToCents(String(formData.get("oversizedOs") || "50")),
      oversizedDosCents: dollarsToCents(String(formData.get("oversizedDos") || "100")),
      oversizedTripleCents: dollarsToCents(String(formData.get("oversizedTriple") || "150")),
    },
  });
  revalidatePath("/settings");
}

export async function saveMarkupRuleAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const percent = Number(formData.get("percent") || 0);
  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_");
  if (!name || !code) return;
  if (id) {
    await prisma.markupRule.update({
      where: { id },
      data: { name, percent, isActive: formData.get("isActive") === "on" },
    });
  } else {
    await prisma.markupRule.create({
      data: {
        name,
        code,
        percent,
        isActive: true,
        sortOrder: 99,
      },
    });
  }
  revalidatePath("/settings/markups");
}

export async function saveMatrixRowsAction(
  rows: {
    id: string;
    dimeCents: number;
    nickelCents: number;
    quarterCents: number;
    halfDollarCents: number;
  }[],
) {
  await requireAdmin();
  await prisma.$transaction(
    rows.map((row) =>
      prisma.pdrMatrixRow.update({
        where: { id: row.id },
        data: {
          dimeCents: row.dimeCents,
          nickelCents: row.nickelCents,
          quarterCents: row.quarterCents,
          halfDollarCents: row.halfDollarCents,
        },
      }),
    ),
  );
  revalidatePath("/settings/matrix");
  return { ok: true };
}

export async function saveLaborRateAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const type = formData.get("type") === "FLAT" ? "FLAT" : "HOURLY";
  const amountCents = dollarsToCents(String(formData.get("amount") || "0"));
  const isDefault = formData.get("isDefault") === "on";
  if (!name) return;

  if (isDefault) {
    await prisma.laborRate.updateMany({ data: { isDefault: false } });
  }

  if (id) {
    await prisma.laborRate.update({
      where: { id },
      data: {
        name,
        type,
        amountCents,
        isDefault,
        isActive: formData.get("isActive") !== "off",
      },
    });
  } else {
    await prisma.laborRate.create({
      data: { name, type, amountCents, isDefault, isActive: true },
    });
  }
  revalidatePath("/settings/labor");
}

export async function saveLaborTimeAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const hours = Number(formData.get("hours") || 0);
  const defaultRateId = String(formData.get("defaultRateId") || "") || null;
  const notes = String(formData.get("notes") || "").trim();
  if (!name) return;

  const data = {
    name,
    category: category || null,
    hours,
    defaultRateId,
    notes: notes || null,
    isActive: formData.get("isActive") !== "off",
  };

  if (id) {
    await prisma.laborTime.update({ where: { id }, data });
  } else {
    await prisma.laborTime.create({ data });
  }
  revalidatePath("/settings/labor");
}

export async function initializeCarrierMatrixAction(formData: FormData) {
  await requireAdmin();
  const carrierId = String(formData.get("carrierId") || "");
  const target = await prisma.pdrMatrix.findUnique({ where: { carrierId } });
  const source = await prisma.pdrMatrix.findUnique({
    where: { carrierId: "state_farm" },
    include: { rows: true },
  });
  if (!target || !source || target.carrierId === "state_farm") return;
  await prisma.pdrMatrixRow.deleteMany({ where: { matrixId: target.id } });
  await prisma.pdrMatrixRow.createMany({
    data: source.rows.map((row) => ({
      matrixId: target.id,
      panelCode: row.panelCode,
      panelLabel: row.panelLabel,
      minDents: row.minDents,
      maxDents: row.maxDents,
      dimeCents: 0,
      nickelCents: 0,
      quarterCents: 0,
      halfDollarCents: 0,
    })),
  });
  revalidatePath("/settings/matrix");
}

export async function setCarrierStubAction(formData: FormData) {
  await requireAdmin();
  const carrierId = String(formData.get("carrierId") || "");
  const isStub = String(formData.get("isStub") || "true") === "true";
  await prisma.pdrMatrix.update({
    where: { carrierId },
    data: { isStub, isActive: !isStub },
  });
  revalidatePath("/settings/matrix");
}

export async function toggleLaborActiveAction(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind") || "");
  const id = String(formData.get("id") || "");
  const isActive = formData.get("isActive") === "true";
  if (kind === "rate") {
    await prisma.laborRate.update({ where: { id }, data: { isActive } });
  } else {
    await prisma.laborTime.update({ where: { id }, data: { isActive } });
  }
  revalidatePath("/settings/labor");
}
