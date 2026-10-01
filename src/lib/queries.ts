import type { EstimateStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function getCarrierMatrices() {
  const matrices = await prisma.pdrMatrix.findMany({
    include: { rows: { orderBy: [{ panelCode: "asc" }, { minDents: "asc" }] } },
  });
  return matrices.map((matrix) => ({
    carrierId: matrix.carrierId,
    name: matrix.name,
    isStub: matrix.isStub || matrix.rows.length === 0,
    rows: matrix.rows.map((row) => ({
      id: row.id,
      panelCode: row.panelCode,
      panelLabel: row.panelLabel,
      minDents: row.minDents,
      maxDents: row.maxDents,
      dimeCents: row.dimeCents,
      nickelCents: row.nickelCents,
      quarterCents: row.quarterCents,
      halfDollarCents: row.halfDollarCents,
    })),
  }));
}

export async function getShopCatalog() {
  const [settings, matrix, markups, laborRates, laborTimes] = await Promise.all([
    prisma.shopSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }),
    prisma.pdrMatrix.findFirst({
      where: { OR: [{ carrierId: "state_farm" }, { isActive: true }] },
      include: { rows: { orderBy: [{ panelCode: "asc" }, { minDents: "asc" }] } },
      orderBy: { isStub: "asc" },
    }),
    prisma.markupRule.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.laborRate.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.laborTime.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { defaultRate: true },
    }),
  ]);

  return { settings, matrix, markups, laborRates, laborTimes };
}

export async function getCustomerOptions() {
  return prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      vehicles: { orderBy: { createdAt: "asc" } },
      claims: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          claimNumber: true,
          insuranceCarrier: true,
          vehicleId: true,
          status: true,
        },
      },
    },
  });
}

export function toEstimateCatalog(catalog: Awaited<ReturnType<typeof getShopCatalog>>) {
  return {
    settings: {
      maxCombinedMarkupPercent: catalog.settings.maxCombinedMarkupPercent,
      oversizedOsCents: catalog.settings.oversizedOsCents,
      oversizedDosCents: catalog.settings.oversizedDosCents,
      oversizedTripleCents: catalog.settings.oversizedTripleCents,
      defaultHourlyCents:
        catalog.laborRates.find((rate) => rate.isDefault && rate.type === "HOURLY")
          ?.amountCents ??
        catalog.laborRates.find((rate) => rate.type === "HOURLY")?.amountCents ??
        6000,
    },
    matrixRows: (catalog.matrix?.rows ?? []).map((row) => ({
      id: row.id,
      matrixId: row.matrixId,
      panelCode: row.panelCode,
      panelLabel: row.panelLabel,
      minDents: row.minDents,
      maxDents: row.maxDents,
      dimeCents: row.dimeCents,
      nickelCents: row.nickelCents,
      quarterCents: row.quarterCents,
      halfDollarCents: row.halfDollarCents,
    })),
    markups: catalog.markups.map((rule) => ({
      id: rule.id,
      code: rule.code,
      name: rule.name,
      percent: rule.percent,
      isActive: rule.isActive,
      sortOrder: rule.sortOrder,
    })),
    laborRates: catalog.laborRates.map((rate) => ({
      id: rate.id,
      name: rate.name,
      type: rate.type,
      amountCents: rate.amountCents,
      isDefault: rate.isDefault,
      isActive: rate.isActive,
    })),
    laborTimes: catalog.laborTimes.map((time) => ({
      id: time.id,
      name: time.name,
      category: time.category,
      hours: time.hours,
      defaultRateId: time.defaultRateId,
      notes: time.notes,
      isActive: time.isActive,
      sortOrder: time.sortOrder,
      defaultRate: time.defaultRate
        ? {
            id: time.defaultRate.id,
            name: time.defaultRate.name,
            type: time.defaultRate.type,
            amountCents: time.defaultRate.amountCents,
            isDefault: time.defaultRate.isDefault,
            isActive: time.defaultRate.isActive,
          }
        : null,
    })),
  };
}

export function toCustomerOptions(
  customers: Awaited<ReturnType<typeof getCustomerOptions>>,
) {
  return customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    vehicles: customer.vehicles.map((vehicle) => ({
      id: vehicle.id,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      vin: vehicle.vin,
      bodyClass: vehicle.bodyClass,
    })),
    claims: customer.claims.map((claim) => ({
      id: claim.id,
      claimNumber: claim.claimNumber,
      insuranceCarrier: claim.insuranceCarrier,
      vehicleId: claim.vehicleId,
    })),
  }));
}

export function nextStatusOptions(status: string): EstimateStatus[] {
  if (status === "DRAFT") return ["PENDING_APPROVAL"];
  if (status === "PENDING_APPROVAL") return ["APPROVED", "DECLINED", "DRAFT"];
  if (status === "APPROVED" || status === "DECLINED") return ["DRAFT"];
  return [];
}
