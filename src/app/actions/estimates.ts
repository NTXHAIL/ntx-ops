"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstimateStatus, LineItemType, OversizedKind } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emptyToNull } from "@/lib/form-data";
import { isBodyStyle } from "@/lib/body-styles";
import {
  calculateConventionalLine,
  calculateCustomLine,
  calculateEstimateTotals,
  calculateLaborLine,
  calculateOversizedLine,
  calculatePanelLine,
  calculateReplaceLine,
  normalizeOversizedKind,
  oversizedUnitCents,
  type CalculatedLine,
} from "@/lib/estimate-calc";
import type { EstimateDraftLine, EstimateDraftPayload } from "@/lib/estimate-types";
import { DEFAULT_LABOR_RATE_CENTS } from "@/lib/hailspec";
import { getCarrierMatrices, getShopCatalog, nextStatusOptions } from "@/lib/queries";

export async function saveEstimateAction(
  payload: EstimateDraftPayload,
): Promise<{ id: string; estimateNumber: string } | { error: string }> {
  const user = await requireUser();

  const ownerName = payload.ownerName?.trim() || "";
  if (!payload.customerId && !ownerName) {
    return { error: "Enter an owner name before saving." };
  }

  const [catalog, carriers] = await Promise.all([getShopCatalog(), getCarrierMatrices()]);
  if (!catalog.matrix) {
    return { error: "No active PDR matrix is configured." };
  }
  const selectedCarrier = carriers.find((item) => item.carrierId === (payload.carrierId || "state_farm"));
  const stateFarm = carriers.find((item) => item.carrierId === "state_farm");
  const matrixRows =
    selectedCarrier && !selectedCarrier.isStub && selectedCarrier.rows.length
      ? selectedCarrier.rows
      : stateFarm?.rows ?? catalog.matrix.rows;

  const hourly =
    catalog.laborRates.find((rate) => rate.isDefault && rate.type === "HOURLY")
      ?.amountCents ??
    catalog.laborRates.find((rate) => rate.type === "HOURLY")?.amountCents ??
    DEFAULT_LABOR_RATE_CENTS;

  let customerId: string | undefined = payload.customerId || undefined;
  if (!customerId && ownerName) {
    const existing = await prisma.customer.findFirst({
      where: { name: ownerName },
    });
    customerId = existing
      ? existing.id
      : (
          await prisma.customer.create({
            data: { name: ownerName, notes: "Created from HailSpec estimate" },
          })
        ).id;
  }
  if (!customerId) {
    return { error: "Enter an owner name before saving." };
  }

  let vehicleId = payload.vehicleId || null;
  if (customerId && payload.vehiclePatch && (payload.vehiclePatch.year || payload.vehiclePatch.make || payload.vehiclePatch.vin)) {
    if (vehicleId) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          year: emptyToNull(payload.vehiclePatch.year),
          make: emptyToNull(payload.vehiclePatch.make),
          model: emptyToNull(payload.vehiclePatch.model),
          vin: emptyToNull(payload.vehiclePatch.vin),
          bodyClass: emptyToNull(payload.vehiclePatch.bodyClass),
        },
      }).catch(() => null);
    } else {
      const created = await prisma.vehicle.create({
        data: {
          customerId,
          year: emptyToNull(payload.vehiclePatch.year),
          make: emptyToNull(payload.vehiclePatch.make),
          model: emptyToNull(payload.vehiclePatch.model),
          vin: emptyToNull(payload.vehiclePatch.vin),
          bodyClass: emptyToNull(payload.vehiclePatch.bodyClass),
        },
      });
      vehicleId = created.id;
    }
  }

  let claimId = payload.claimId || null;
  const claimNumber = payload.claimNumber?.trim();
  if (customerId && claimNumber && !claimId) {
    const existingClaim = await prisma.claim.findFirst({
      where: { customerId, claimNumber },
    });
    claimId = existingClaim
      ? existingClaim.id
      : (
          await prisma.claim.create({
            data: { customerId, vehicleId, claimNumber },
          })
        ).id;
  }

  const rows = payload.lines.map((line, index) =>
    persistLine(line, index, catalog, hourly, matrixRows),
  );
  const totals = calculateEstimateTotals(rows.map((row) => row.calculated));

  const existing = payload.id
    ? await prisma.estimate.findUnique({ where: { id: payload.id } })
    : null;

  if (existing && existing.status !== "DRAFT") {
    return { error: "Only draft estimates can be edited. Reopen it to draft first." };
  }

  const header = {
    customerId,
    vehicleId,
    claimId,
    notes: payload.notes?.trim() || null,
    bodyStyle: isBodyStyle(payload.bodyStyle) ? payload.bodyStyle : "CAR",
    carrierId: payload.carrierId || "state_farm",
    ...totals,
  };

  if (payload.vehicleId && payload.vehiclePatch) {
    try {
      await prisma.vehicle.update({
        where: { id: payload.vehicleId },
        data: {
          year: emptyToNull(payload.vehiclePatch.year),
          make: emptyToNull(payload.vehiclePatch.make),
          model: emptyToNull(payload.vehiclePatch.model),
          vin: emptyToNull(payload.vehiclePatch.vin),
          bodyClass: emptyToNull(payload.vehiclePatch.bodyClass),
        },
      });
    } catch (error) {
      console.error("Vehicle update after VIN decode failed; estimate will still save.", error);
    }
  }

  let estimate;
  try {
    estimate = existing
    ? await prisma.$transaction(async (tx) => {
        await tx.estimateLineItem.deleteMany({ where: { estimateId: existing.id } });
        return tx.estimate.update({
          where: { id: existing.id },
          data: {
            ...header,
            lineItems: { create: rows.map((row) => row.data) },
          },
        });
      })
    : await prisma.$transaction(async (tx) => {
        const settings = await tx.shopSettings.update({
          where: { id: "default" },
          data: { nextEstimateSeq: { increment: 1 } },
        });
        const estimateNumber = `EST-${settings.nextEstimateSeq - 1}`;
        return tx.estimate.create({
          data: {
            estimateNumber,
            status: "DRAFT",
            createdById: user.id,
            ...header,
            lineItems: { create: rows.map((row) => row.data) },
          },
        });
      });
  } catch (error) {
    console.error("saveEstimateAction failed", error);
    return { error: "Could not save that estimate. Check the lines and try again." };
  }

  if (payload.photos) {
    await persistEstimatePhotos(estimate.id, payload.photos);
  }

  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimate.id}`);
  revalidatePath("/customers");
  return { id: estimate.id, estimateNumber: estimate.estimateNumber };
}

export async function listSavedEstimatesAction() {
  const user = await requireUser();
  return prisma.estimate.findMany({
    where: user.role === "ADMIN" ? undefined : { createdById: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      customer: true,
      vehicle: true,
      claim: true,
      lineItems: { select: { panelCode: true } },
    },
  });
}

export async function deleteEstimateAction(id: string) {
  const user = await requireUser();
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) return { error: "Estimate not found" };
  if (user.role !== "ADMIN" && estimate.createdById !== user.id) {
    return { error: "You cannot delete that estimate." };
  }
  await prisma.estimate.delete({ where: { id } });
  revalidatePath("/estimates");
  return { ok: true };
}

async function persistEstimatePhotos(
  estimateId: string,
  photos: { path?: string; name: string; dataUrl?: string }[],
) {
  const kept: { path: string; name: string }[] = [];
  for (const photo of photos) {
    if (photo.path && !photo.dataUrl) {
      kept.push({ path: photo.path, name: photo.name });
      continue;
    }
    if (!photo.dataUrl?.startsWith("data:image/")) continue;
    const match = photo.dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) continue;
    const ext = match[1].includes("png") ? "png" : match[1].includes("webp") ? "webp" : "jpg";
    const name = `${randomUUID()}.${ext}`;
    const dir = join(process.cwd(), "public", "estimate-photos", estimateId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), Buffer.from(match[2], "base64"));
    kept.push({ path: `/estimate-photos/${estimateId}/${name}`, name: photo.name || name });
  }
  await prisma.estimatePhoto.deleteMany({ where: { estimateId } });
  if (kept.length) {
    await prisma.estimatePhoto.createMany({
      data: kept.map((photo) => ({ estimateId, path: photo.path, name: photo.name })),
    });
  }
}

export async function updateEstimateStatusAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as EstimateStatus;
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) redirect("/estimates");

  const allowed = nextStatusOptions(estimate.status);
  if (!allowed.includes(status)) {
    redirect(`/estimates/${id}?error=${encodeURIComponent("That status change is not allowed.")}`);
  }

  if ((status === "APPROVED" || status === "DECLINED") && user.role !== "ADMIN") {
    redirect(
      `/estimates/${id}?error=${encodeURIComponent("Only an admin can approve or decline an estimate.")}`,
    );
  }

  await prisma.estimate.update({ where: { id }, data: { status } });
  revalidatePath("/estimates");
  revalidatePath(`/estimates/${id}`);
  redirect(`/estimates/${id}`);
}

function persistLine(
  line: EstimateDraftLine,
  index: number,
  catalog: Awaited<ReturnType<typeof getShopCatalog>>,
  hourlyRateCents: number,
  matrixRows: { panelCode: string; minDents: number; maxDents: number | null; dimeCents: number; nickelCents: number; quarterCents: number; halfDollarCents: number }[],
) {
  if (line.type === "PDR_PANEL") {
    const result = calculatePanelLine(
      line,
      matrixRows,
      catalog.markups,
      catalog.settings.maxCombinedMarkupPercent,
    );
    const calculated: CalculatedLine = { type: "PDR_PANEL", ...result };
    return {
      calculated,
      data: {
        sortOrder: index,
        type: "PDR_PANEL" as LineItemType,
        description: result.description,
        panelCode: line.panelCode,
        dentCount: line.dentCount,
        dentSize: line.dentSize,
        markupCodesJson: JSON.stringify(line.markupCodes),
        markupPercentApplied: result.markupPercentApplied,
        markupAmountCents: result.markupAmountCents,
        matrixAmountCents: result.baseCents,
        unitAmountCents: result.baseCents,
        amountCents: result.amountCents,
        notes: result.usedOverride ? "override" : null,
        auditNote: `${result.lookupLabel} · ${result.markupSummary}${result.usedOverride ? " · base overridden" : ""}`,
      },
    };
  }

  if (line.type === "OVERSIZED") {
    const kind = normalizeOversizedKind(line.kind);
    const defaultUnit = oversizedUnitCents(kind, catalog.settings);
    const result = calculateOversizedLine({
      kind,
      quantity: line.quantity,
      unitCents: line.overrideUnitCents ?? defaultUnit,
    });
    const calculated: CalculatedLine = { type: "OVERSIZED", ...result };
    return {
      calculated,
      data: {
        sortOrder: index,
        type: "OVERSIZED" as LineItemType,
        description: result.description,
        panelCode: line.panelCode || null,
        oversizedKind: kind as OversizedKind,
        quantity: result.quantity,
        unitAmountCents: result.unitAmountCents,
        amountCents: result.amountCents,
        notes: line.overrideUnitCents != null ? "override" : null,
        auditNote:
          line.overrideUnitCents != null
            ? `Unit overridden from shop default ${formatAuditMoney(defaultUnit)}`
            : `Shop default ${kind} unit ${formatAuditMoney(defaultUnit)}`,
      },
    };
  }

  if (line.type === "LABOR") {
    const rate = line.laborRateId
      ? catalog.laborRates.find((item) => item.id === line.laborRateId)
      : null;
    const time = line.laborTimeId
      ? catalog.laborTimes.find((item) => item.id === line.laborTimeId)
      : null;
    const quantity = Math.max(1, Math.round(line.quantity || 1));
    const rateOverridden = Boolean(
      rate && Math.round(line.rateCents) !== rate.amountCents,
    );
    const expectedHours = time ? time.hours * quantity : line.hours;
    const timeOverridden = Boolean(
      time && Number(line.hours.toFixed(2)) !== Number(expectedHours.toFixed(2)),
    );
    const result = calculateLaborLine({
      description: line.description || time?.name || "Labor",
      rateType: line.rateType,
      hours: line.hours,
      rateCents: line.rateCents,
      rateName: rate?.name,
      timeName: time?.name,
      catalogRateCents: rate?.amountCents,
      catalogHours: time?.hours,
      rateOverridden,
      timeOverridden,
    });
    const calculated: CalculatedLine = { type: "LABOR", ...result };
    return {
      calculated,
      data: {
        sortOrder: index,
        type: "LABOR" as LineItemType,
        description: result.description,
        panelCode: line.panelCode || null,
        laborRateId: line.laborRateId,
        laborTimeId: line.laborTimeId,
        laborHours: result.hours,
        laborRateCents: result.rateCents,
        rateType: result.rateType,
        quantity,
        usedCatalogRate: Boolean(rate),
        usedCatalogTime: Boolean(time),
        rateOverridden,
        timeOverridden,
        auditNote: result.auditNote,
        unitAmountCents: result.rateCents,
        amountCents: result.amountCents,
      },
    };
  }

  if (line.type === "CONVENTIONAL") {
    const rate = line.hourlyRateCents ?? hourlyRateCents;
    const result = calculateConventionalLine({
      ...line,
      hourlyRateCents: rate,
    });
    const calculated: CalculatedLine = { type: "CONVENTIONAL", ...result };
    return {
      calculated,
      data: {
        sortOrder: index,
        type: "CONVENTIONAL" as LineItemType,
        description: result.description,
        panelCode: line.panelCode,
        laborHours: result.hours,
        laborRateCents: rate,
        rateType: "HOURLY" as const,
        unitAmountCents: result.flatCents,
        amountCents: result.amountCents,
        notes: line.notes.trim() || null,
        auditNote: [
          result.hours ? `${trimHours(result.hours)}h × ${formatAuditMoney(rate)}` : null,
          result.flatCents ? `flat ${formatAuditMoney(result.flatCents)}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Conventional repair",
      },
    };
  }

  if (line.type === "REPLACE") {
    const rate = line.hourlyRateCents ?? hourlyRateCents;
    const result = calculateReplaceLine({
      ...line,
      hourlyRateCents: rate,
    });
    const calculated: CalculatedLine = { type: "REPLACE", ...result };
    return {
      calculated,
      data: {
        sortOrder: index,
        type: "REPLACE" as LineItemType,
        description: result.description,
        panelCode: line.panelCode,
        laborHours: result.hours,
        laborRateCents: rate,
        rateType: "HOURLY" as const,
        partsCents: result.partsCents,
        unitAmountCents: line.amountCents,
        amountCents: result.amountCents,
        notes: line.description.trim() || null,
        auditNote: [
          result.partsCents ? `parts ${formatAuditMoney(result.partsCents)}` : null,
          result.hours ? `${trimHours(result.hours)}h × ${formatAuditMoney(rate)}` : null,
          line.amountCents ? `labor ${formatAuditMoney(line.amountCents)}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Replacement / R&R",
      },
    };
  }

  const result = calculateCustomLine(line);
  const calculated: CalculatedLine = { type: "CUSTOM", ...result };
  return {
    calculated,
    data: {
      sortOrder: index,
      type: "CUSTOM" as LineItemType,
      description: result.description,
      amountCents: result.amountCents,
      unitAmountCents: result.amountCents,
    },
  };
}

function formatAuditMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function trimHours(hours: number) {
  return Number(hours.toFixed(2)).toString();
}
