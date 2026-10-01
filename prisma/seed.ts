import {
  PrismaClient,
  type EstimateStatus,
  type LineItemType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildStateFarmMatrixRows, CARRIER_SEED } from "../src/lib/hailspec-matrix";
import {
  calculateCustomLine,
  calculateEstimateTotals,
  calculateLaborLine,
  calculateOversizedLine,
  calculatePanelLine,
  type CalculatedLine,
} from "../src/lib/estimate-calc";
import { DEFAULT_STORM_OFFER, SMS_CONSENT_TEXT, SMS_CONSENT_VERSION } from "../src/lib/storms/consent";
import { loadZipCentroids } from "../src/lib/storms/zips";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("HailOps!admin", 10);
  const estimatorHash = await bcrypt.hash("HailOps!est", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ntxhail.local" },
    update: { name: "Alex Rivera", role: "ADMIN", passwordHash: adminHash },
    create: {
      email: "admin@ntxhail.local",
      name: "Alex Rivera",
      role: "ADMIN",
      passwordHash: adminHash,
    },
  });

  const estimator = await prisma.user.upsert({
    where: { email: "estimator@ntxhail.local" },
    update: {
      name: "Jordan Hale",
      role: "ESTIMATOR",
      passwordHash: estimatorHash,
    },
    create: {
      email: "estimator@ntxhail.local",
      name: "Jordan Hale",
      role: "ESTIMATOR",
      passwordHash: estimatorHash,
    },
  });

  await prisma.shopSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      maxCombinedMarkupPercent: 50,
      oversizedOsCents: 5000,
      oversizedDosCents: 10000,
      oversizedTripleCents: 15000,
      nextEstimateSeq: 1004,
    },
  });

  const markupSeeds = [
    { code: "ALUMINUM", name: "Aluminum", percent: 25, sortOrder: 1 },
    { code: "HSS", name: "High-strength steel (HSS)", percent: 25, sortOrder: 2 },
    { code: "DOUBLE_PANEL", name: "Double Panel", percent: 25, sortOrder: 3 },
    { code: "LIMITED_ACCESS", name: "Limited Access", percent: 20, sortOrder: 4 },
    { code: "TALL_VEHICLE", name: "Tall Vehicle", percent: 25, sortOrder: 5 },
    { code: "LARGE_ROOF", name: "XL Panel", percent: 25, sortOrder: 6 },
  ];

  for (const rule of markupSeeds) {
    await prisma.markupRule.upsert({
      where: { code: rule.code },
      update: { name: rule.name, percent: rule.percent, isActive: true },
      create: rule,
    });
  }

  for (const carrier of CARRIER_SEED) {
    await prisma.pdrMatrix.upsert({
      where: { carrierId: carrier.id },
      update: { name: carrier.name, isStub: carrier.isStub, isActive: !carrier.isStub },
      create: {
        name: carrier.name,
        carrierId: carrier.id,
        isStub: carrier.isStub,
        isActive: !carrier.isStub,
      },
    });
  }

  const matrix = await prisma.pdrMatrix.findUniqueOrThrow({
    where: { carrierId: "state_farm" },
  });
  const sfHood = await prisma.pdrMatrixRow.findFirst({
    where: { matrixId: matrix.id, panelCode: "HOOD", minDents: 16, dimeCents: 20000 },
  });
  const staleShopCodes = await prisma.pdrMatrixRow.findFirst({
    where: {
      matrixId: matrix.id,
      panelCode: { in: ["FENDER_LF", "DECK", "DOOR_LF", "ROOF_RAIL_L"] },
    },
  });
  if (!sfHood || staleShopCodes) {
    await prisma.pdrMatrixRow.deleteMany({ where: { matrixId: matrix.id } });
    await prisma.pdrMatrixRow.createMany({
      data: buildStateFarmMatrixRows().map((row) => ({ ...row, matrixId: matrix.id })),
    });
  }

  const shopRate = await upsertRate("Shop labor", "HOURLY", 6000, true);
  await upsertRate("Mobile tech", "HOURLY", 9500, false);
  await upsertRate("Flat R&I access", "FLAT", 7500, false);

  const laborTimes = [
    { name: "Headliner R&I", category: "Interior", hours: 2.0, sortOrder: 1 },
    { name: "Roof moldings R&I", category: "Exterior", hours: 0.8, sortOrder: 2 },
    { name: "Door glass R&I (each)", category: "Glass", hours: 0.6, sortOrder: 3 },
    { name: "Mirror R&I", category: "Exterior", hours: 0.3, sortOrder: 4 },
    { name: "Emblems / badges", category: "Exterior", hours: 0.4, sortOrder: 5 },
    { name: "Antenna R&I", category: "Exterior", hours: 0.2, sortOrder: 6 },
    { name: "Spoiler R&I", category: "Exterior", hours: 0.5, sortOrder: 7 },
    { name: "Inner door panel R&I", category: "Interior", hours: 0.7, sortOrder: 8 },
    { name: "Weatherstrip", category: "Exterior", hours: 0.4, sortOrder: 9 },
    { name: "Tail lamp R&I", category: "Lighting", hours: 0.3, sortOrder: 10 },
    { name: "Headlamp R&I", category: "Lighting", hours: 0.4, sortOrder: 11 },
    { name: "Cowl vent panel", category: "Exterior", hours: 0.5, sortOrder: 12 },
  ];

  for (const item of laborTimes) {
    const existing = await prisma.laborTime.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.laborTime.create({
        data: { ...item, defaultRateId: shopRate.id, isActive: true },
      });
    }
  }

  await prisma.estimate.updateMany({
    where: { estimateNumber: { in: ["EST-1002", "EST-1003"] } },
    data: { bodyStyle: "TRUCK" },
  });

  const existingDemo = await prisma.estimate.findUnique({
    where: { estimateNumber: "EST-1001" },
  });
  if (existingDemo) {
    await seedStorms();
    console.log("Seed complete (sample records already present).");
    return;
  }

  const whitaker = await prisma.customer.create({
    data: {
      name: "James Whitaker",
      phonePrimary: "2145550188",
      emailPrimary: "james.whitaker@example.com",
      street: "1842 Mockingbird Lane",
      city: "Plano",
      state: "TX",
      zip: "75074",
      notes: "Prefers morning drop-off. Referred by State Farm adjuster.",
      vehicles: {
        create: [
          {
            year: "2019",
            make: "Ford",
            model: "F-150 XLT",
            vin: "1FTEW1E49KFB48221",
            color: "Oxford White",
          },
          {
            year: "2022",
            make: "Ford",
            model: "Explorer",
            vin: "1FM5K8D83NGA11034",
            color: "Carbonized Gray",
          },
        ],
      },
    },
    include: { vehicles: true },
  });

  const delgado = await prisma.customer.create({
    data: {
      name: "Maria Delgado",
      phonePrimary: "9725550142",
      phoneSecondary: "4695550177",
      emailPrimary: "maria.delgado@example.com",
      street: "620 Maple Ridge Dr",
      city: "McKinney",
      state: "TX",
      zip: "75071",
      notes: "Will wait on-site if the estimate is under two hours.",
      vehicles: {
        create: [
          {
            year: "2021",
            make: "Toyota",
            model: "Camry SE",
            vin: "4T1C11AK5MU582901",
            color: "Celestial Silver",
          },
        ],
      },
    },
    include: { vehicles: true },
  });

  const fleet = await prisma.customer.create({
    data: {
      name: "North Texas Fleet Services",
      phonePrimary: "8175550190",
      emailPrimary: "dispatch@ntxfleet.example.com",
      emailSecondary: "ap@ntxfleet.example.com",
      street: "4100 Commerce Dr",
      city: "Fort Worth",
      state: "TX",
      zip: "76106",
      notes: "Commercial account. Send estimates to dispatch and AP.",
      vehicles: {
        create: [
          {
            year: "2020",
            make: "Chevrolet",
            model: "Silverado 1500",
            vin: "3GCUYDED5LG312447",
            color: "Black",
          },
        ],
      },
    },
    include: { vehicles: true },
  });

  const f150 = whitaker.vehicles[0];
  const camry = delgado.vehicles[0];
  const silverado = fleet.vehicles[0];

  const claim = await prisma.claim.create({
    data: {
      claimNumber: "TX-HL-88421",
      insuranceCarrier: "State Farm",
      adjusterName: "Riley Chen",
      adjusterPhone: "8007828332",
      adjusterEmail: "riley.chen@statefarm.example.com",
      deductibleCents: 50000,
      dateOfLoss: new Date("2026-04-12T12:00:00Z"),
      status: "IN_REVIEW",
      notes: "April hail cell over Plano. Photos already in the claim file.",
      customerId: whitaker.id,
      vehicleId: f150.id,
    },
  });

  const matrixRows = await prisma.pdrMatrixRow.findMany({
    where: { matrixId: matrix.id },
  });
  const markupRules = await prisma.markupRule.findMany({ where: { isActive: true } });
  const settings = await prisma.shopSettings.findUniqueOrThrow({
    where: { id: "default" },
  });
  const headliner = await prisma.laborTime.findFirstOrThrow({
    where: { name: "Headliner R&I" },
  });
  const moldings = await prisma.laborTime.findFirstOrThrow({
    where: { name: "Roof moldings R&I" },
  });

  await createSeedEstimate({
    estimateNumber: "EST-1001",
    status: "DRAFT",
    customerId: delgado.id,
    vehicleId: camry.id,
    createdById: estimator.id,
    notes: "Light spring hail. Customer wants to review before we file.",
    bodyStyle: "CAR",
    settings,
    matrixRows,
    markupRules,
    lines: [
      {
        type: "PDR_PANEL",
        panelCode: "HOOD",
        dentCount: 8,
        dentSize: "DIME",
        markupCodes: [],
      },
      {
        type: "PDR_PANEL",
        panelCode: "ROOF",
        dentCount: 18,
        dentSize: "NICKEL",
        markupCodes: [],
      },
      {
        type: "PDR_PANEL",
        panelCode: "DECK",
        dentCount: 6,
        dentSize: "DIME",
        markupCodes: [],
      },
      {
        type: "OVERSIZED",
        kind: "OS",
        quantity: 1,
        unitCents: settings.oversizedOsCents,
      },
      {
        type: "LABOR",
        description: moldings.name,
        rateType: "HOURLY",
        hours: moldings.hours,
        rateCents: shopRate.amountCents,
        rateName: shopRate.name,
        timeName: moldings.name,
        laborRateId: shopRate.id,
        laborTimeId: moldings.id,
      },
    ],
  });

  await createSeedEstimate({
    estimateNumber: "EST-1002",
    status: "PENDING_APPROVAL",
    customerId: whitaker.id,
    vehicleId: f150.id,
    claimId: claim.id,
    createdById: estimator.id,
    notes: "Aluminum hood. Two OS dents on the roof, one 2× OS on the cab corner.",
    bodyStyle: "TRUCK",
    settings,
    matrixRows,
    markupRules,
    lines: [
      {
        type: "PDR_PANEL",
        panelCode: "HOOD",
        dentCount: 24,
        dentSize: "NICKEL",
        markupCodes: ["ALUMINUM"],
      },
      {
        type: "PDR_PANEL",
        panelCode: "ROOF",
        dentCount: 41,
        dentSize: "QUARTER",
        markupCodes: ["LARGE_ROOF"],
      },
      {
        type: "PDR_PANEL",
        panelCode: "DOOR_LF",
        dentCount: 11,
        dentSize: "DIME",
        markupCodes: [],
      },
      {
        type: "PDR_PANEL",
        panelCode: "DOOR_RF",
        dentCount: 9,
        dentSize: "DIME",
        markupCodes: [],
      },
      {
        type: "OVERSIZED",
        kind: "OS",
        quantity: 2,
        unitCents: settings.oversizedOsCents,
      },
      {
        type: "OVERSIZED",
        kind: "DOS",
        quantity: 1,
        unitCents: settings.oversizedDosCents,
      },
      {
        type: "LABOR",
        description: headliner.name,
        rateType: "HOURLY",
        hours: headliner.hours,
        rateCents: shopRate.amountCents,
        rateName: shopRate.name,
        timeName: headliner.name,
        laborRateId: shopRate.id,
        laborTimeId: headliner.id,
      },
      {
        type: "LABOR",
        description: moldings.name,
        rateType: "HOURLY",
        hours: moldings.hours,
        rateCents: shopRate.amountCents,
        rateName: shopRate.name,
        timeName: moldings.name,
        laborRateId: shopRate.id,
        laborTimeId: moldings.id,
      },
    ],
  });

  await createSeedEstimate({
    estimateNumber: "EST-1003",
    status: "APPROVED",
    customerId: fleet.id,
    vehicleId: silverado.id,
    createdById: admin.id,
    notes: "Fleet unit approved by dispatch. Schedule after the next storm wave.",
    bodyStyle: "TRUCK",
    settings,
    matrixRows,
    markupRules,
    lines: [
      {
        type: "PDR_PANEL",
        panelCode: "HOOD",
        dentCount: 14,
        dentSize: "NICKEL",
        markupCodes: [],
      },
      {
        type: "PDR_PANEL",
        panelCode: "ROOF",
        dentCount: 33,
        dentSize: "QUARTER",
        markupCodes: ["LARGE_ROOF"],
      },
      {
        type: "PDR_PANEL",
        panelCode: "QUARTER_L",
        dentCount: 7,
        dentSize: "DIME",
        markupCodes: [],
      },
      {
        type: "CUSTOM",
        description: "Corrosion protection (3 panels)",
        amountCents: 3000,
      },
    ],
  });

  await seedStorms();

  console.log("Seed complete.");
  console.log("  Admin      admin@ntxhail.local / HailOps!admin");
  console.log("  Estimator  estimator@ntxhail.local / HailOps!est");
}

async function seedStorms() {
  const centroids = loadZipCentroids();
  const pick = (codes: string[]) =>
    codes
      .map((zip) => centroids.find((row) => row.zip === zip))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const approved = await prisma.storm.upsert({
    where: { slug: "2026-04-28-dallas-fort-worth" },
    update: { status: "APPROVED" },
    create: {
      name: "Dallas–Fort Worth hail",
      slug: "2026-04-28-dallas-fort-worth",
      occurredOn: new Date("2026-04-28T12:00:00.000Z"),
      states: "TX",
      peakHailInches: 1.75,
      source: "Seed demo",
      status: "APPROVED",
      headline: "Hail hit Frisco, Plano, and McKinney on Apr 28?",
      offerText: DEFAULT_STORM_OFFER,
    },
  });
  if ((await prisma.stormZip.count({ where: { stormId: approved.id } })) === 0) {
    const zips = pick(["75034", "75035", "75070", "75093", "75078", "75201", "76051", "75024"]);
    await prisma.stormZip.createMany({
      data: zips.map((zip, index) => ({
        stormId: approved.id,
        zip: zip.zip,
        city: zip.city,
        county: zip.county,
        state: zip.state,
        maxHailInches: index < 2 ? 1.75 : 1.25,
        lat: zip.lat,
        lon: zip.lon,
      })),
    });
  }

  const detected = await prisma.storm.upsert({
    where: { slug: "2026-05-10-quitman-hawkins" },
    update: {},
    create: {
      name: "Quitman / Hawkins hail",
      slug: "2026-05-10-quitman-hawkins",
      occurredOn: new Date("2026-05-10T12:00:00.000Z"),
      states: "TX",
      peakHailInches: 1.75,
      source: "SPC LSR sample",
      status: "DETECTED",
      offerText: DEFAULT_STORM_OFFER,
    },
  });
  if ((await prisma.stormZip.count({ where: { stormId: detected.id } })) === 0) {
    const zips = pick(["75783", "75765", "75773", "75497"]);
    await prisma.stormZip.createMany({
      data: zips.map((zip, index) => ({
        stormId: detected.id,
        zip: zip.zip,
        city: zip.city,
        county: zip.county,
        state: zip.state,
        maxHailInches: index === 0 ? 1.75 : 1.0,
        lat: zip.lat,
        lon: zip.lon,
      })),
    });
  }

  const closed = await prisma.storm.upsert({
    where: { slug: "2025-11-02-okc-metro" },
    update: {},
    create: {
      name: "Oklahoma City hail",
      slug: "2025-11-02-okc-metro",
      occurredOn: new Date("2025-11-02T12:00:00.000Z"),
      states: "OK",
      peakHailInches: 1.5,
      source: "Seed demo",
      status: "CLOSED",
      offerText: DEFAULT_STORM_OFFER,
    },
  });
  if ((await prisma.stormZip.count({ where: { stormId: closed.id } })) === 0) {
    const zips = pick(["73102", "73116", "73013"]);
    await prisma.stormZip.createMany({
      data: zips.map((zip) => ({
        stormId: closed.id,
        zip: zip.zip,
        city: zip.city,
        county: zip.county,
        state: zip.state,
        maxHailInches: 1.5,
        lat: zip.lat,
        lon: zip.lon,
      })),
    });
  }

  if ((await prisma.lead.count({ where: { stormId: approved.id } })) === 0) {
    const casey = await prisma.customer.upsert({
      where: { id: "seed-lead-casey" },
      update: {},
      create: {
        id: "seed-lead-casey",
        name: "Casey Nguyen",
        phonePrimary: "2145550199",
        emailPrimary: "casey.nguyen@example.com",
        city: "Frisco",
        state: "TX",
        zip: "75034",
        notes: "Storm lead (seed)",
      },
    });
    await prisma.lead.create({
      data: {
        stormId: approved.id,
        customerId: casey.id,
        status: "NEW",
        vehicleDamaged: true,
        insurance: "YES",
        vehicleYear: "2021",
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        zip: "75034",
        name: "Casey Nguyen",
        phone: "2145550199",
        email: "casey.nguyen@example.com",
        preferredContact: "TEXT",
        utmSource: "facebook",
        utmMedium: "paid",
        utmCampaign: "dfw-hail-apr28",
        fbclid: "demo.fbclid.seed",
        smsConsent: true,
        consentTextVersion: SMS_CONSENT_VERSION,
        consentText: SMS_CONSENT_TEXT,
        consentAt: new Date("2026-04-29T15:12:00.000Z"),
        consentIp: "203.0.113.10",
        consentUserAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        consentPageUrl: "/storm/2026-04-28-dallas-fort-worth?utm_source=facebook&fbclid=demo.fbclid.seed",
      },
    });
  }
}

type SeedLine =
  | {
      type: "PDR_PANEL";
      panelCode: string;
      dentCount: number;
      dentSize: "DIME" | "NICKEL" | "QUARTER" | "HALF_DOLLAR";
      markupCodes: string[];
    }
  | { type: "OVERSIZED"; kind: "OS" | "DOS"; quantity: number; unitCents: number }
  | {
      type: "LABOR";
      description: string;
      rateType: "HOURLY" | "FLAT";
      hours: number;
      rateCents: number;
      rateName: string;
      timeName: string;
      laborRateId: string;
      laborTimeId: string;
    }
  | { type: "CUSTOM"; description: string; amountCents: number };

async function createSeedEstimate(input: {
  estimateNumber: string;
  status: EstimateStatus;
  customerId: string;
  vehicleId?: string;
  claimId?: string;
  createdById: string;
  notes?: string;
  bodyStyle?: string;
  settings: { maxCombinedMarkupPercent: number };
  matrixRows: Parameters<typeof calculatePanelLine>[1];
  markupRules: { code: string; name: string; percent: number }[];
  lines: SeedLine[];
}) {
  const calculated: CalculatedLine[] = [];
  const persisted = input.lines.map((line, index) => {
    if (line.type === "PDR_PANEL") {
      const result = calculatePanelLine(
        line,
        input.matrixRows,
        input.markupRules,
        input.settings.maxCombinedMarkupPercent,
      );
      calculated.push({ type: "PDR_PANEL", ...result });
      return {
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
        auditNote: `${result.lookupLabel} · ${result.markupSummary}`,
      };
    }
    if (line.type === "OVERSIZED") {
      const result = calculateOversizedLine(line);
      calculated.push({ type: "OVERSIZED", ...result });
      return {
        sortOrder: index,
        type: "OVERSIZED" as LineItemType,
        description: result.description,
        oversizedKind: line.kind,
        quantity: line.quantity,
        unitAmountCents: result.unitAmountCents,
        amountCents: result.amountCents,
      };
    }
    if (line.type === "LABOR") {
      const result = calculateLaborLine(line);
      calculated.push({ type: "LABOR", ...result });
      return {
        sortOrder: index,
        type: "LABOR" as LineItemType,
        description: result.description,
        laborHours: result.hours,
        laborRateCents: result.rateCents,
        rateType: result.rateType,
        laborRateId: line.laborRateId,
        laborTimeId: line.laborTimeId,
        usedCatalogRate: true,
        usedCatalogTime: true,
        auditNote: result.auditNote,
        unitAmountCents: result.rateCents,
        amountCents: result.amountCents,
      };
    }
    const result = calculateCustomLine(line);
    calculated.push({ type: "CUSTOM", ...result });
    return {
      sortOrder: index,
      type: "CUSTOM" as LineItemType,
      description: result.description,
      amountCents: result.amountCents,
      unitAmountCents: result.amountCents,
    };
  });

  const totals = calculateEstimateTotals(calculated);

  await prisma.estimate.create({
    data: {
      estimateNumber: input.estimateNumber,
      status: input.status,
      notes: input.notes,
      bodyStyle: input.bodyStyle ?? "CAR",
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      claimId: input.claimId,
      createdById: input.createdById,
      ...totals,
      lineItems: { create: persisted },
    },
  });
}

async function upsertRate(
  name: string,
  type: "HOURLY" | "FLAT",
  amountCents: number,
  isDefault: boolean,
) {
  const existing = await prisma.laborRate.findFirst({ where: { name } });
  if (existing) {
    return prisma.laborRate.update({
      where: { id: existing.id },
      data: { type, amountCents, isDefault, isActive: true },
    });
  }
  return prisma.laborRate.create({
    data: { name, type, amountCents, isDefault, isActive: true },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
