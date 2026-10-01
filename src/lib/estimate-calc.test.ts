import { describe, expect, it } from "vitest";
import {
  calculateConventionalLine,
  calculateCustomLine,
  calculateEstimateTotals,
  calculateLaborLine,
  calculateOversizedLine,
  calculatePanelLine,
  calculateReplaceLine,
  hailSpecPercentCents,
  lookupMatrixAmount,
  normalizeOversizedKind,
  oversizedKindLabel,
} from "@/lib/estimate-calc";
import { buildStateFarmMatrixRows } from "@/lib/hailspec-matrix";

const matrix = buildStateFarmMatrixRows();

const markups = [
  { code: "ALUMINUM", name: "Aluminum", percent: 25 },
  { code: "HSS", name: "HSS", percent: 25 },
  { code: "DOUBLE_PANEL", name: "Double panel", percent: 25 },
];

describe("lookupMatrixAmount", () => {
  it("looks up hood 4 dime dents in the 1 - 5 State Farm band", () => {
    const result = lookupMatrixAmount(matrix, "HOOD", 4, "DIME");
    expect(result.found).toBe(true);
    expect(result.amountCents).toBe(8000);
    expect(result.label).toContain("Hood");
    expect(result.label).toContain("1 - 5");
  });

  it("uses the 16 - 30 nickel cell for a roof panel ($300)", () => {
    const result = lookupMatrixAmount(matrix, "ROOF", 22, "NICKEL");
    expect(result.found).toBe(true);
    expect(result.amountCents).toBe(30000);
  });

  it("returns zero for a 0-price (R&R) cell", () => {
    const result = lookupMatrixAmount(matrix, "HOOD", 120, "QUARTER");
    expect(result.found).toBe(true);
    expect(result.amountCents).toBe(0);
  });
});

describe("hailSpecPercentCents", () => {
  it("rounds each percent independently on the dollar base", () => {
    expect(hailSpecPercentCents(20000, 25)).toBe(5000);
    expect(hailSpecPercentCents(8000, 25)).toBe(2000);
  });
});

describe("calculatePanelLine", () => {
  it("adds stacked markups onto the matrix base", () => {
    const line = calculatePanelLine(
      {
        panelCode: "HOOD",
        dentCount: 4,
        dentSize: "DIME",
        markupCodes: ["ALUMINUM"],
      },
      matrix,
      markups,
      50,
    );
    expect(line.baseCents).toBe(8000);
    expect(line.markupPercentApplied).toBe(25);
    expect(line.markupAmountCents).toBe(2000);
    expect(line.amountCents).toBe(10000);
  });

  it("does not cap stacked percent add-ons — HailSpec rounds each on base", () => {
    const line = calculatePanelLine(
      {
        panelCode: "HOOD",
        dentCount: 4,
        dentSize: "DIME",
        markupCodes: ["ALUMINUM", "HSS", "DOUBLE_PANEL"],
      },
      matrix,
      markups,
      50,
    );
    expect(line.markupPercentApplied).toBe(75);
    expect(line.markupAmountCents).toBe(6000);
    expect(line.amountCents).toBe(14000);
  });

  it("uses an override as the matrix base before markups", () => {
    const line = calculatePanelLine(
      {
        panelCode: "HOOD",
        dentCount: 4,
        dentSize: "DIME",
        markupCodes: ["ALUMINUM"],
        overrideBaseCents: 20000,
      },
      matrix,
      markups,
      50,
    );
    expect(line.usedOverride).toBe(true);
    expect(line.baseCents).toBe(20000);
    expect(line.markupAmountCents).toBe(5000);
    expect(line.amountCents).toBe(25000);
  });
});

describe("oversized and labor lines", () => {
  it("prices OS dents as quantity × unit and keeps them off the matrix", () => {
    const os = calculateOversizedLine({ kind: "OS", quantity: 3, unitCents: 5000 });
    expect(os.amountCents).toBe(15000);
    expect(os.description).toContain("Oversized");
  });

  it("prices DOS dents at the configured unit", () => {
    const dos = calculateOversizedLine({
      kind: "DOS",
      quantity: 2,
      unitCents: 10000,
    });
    expect(dos.amountCents).toBe(20000);
    expect(dos.description).toContain("2× oversized");
  });

  it("prices 2× OS and 3× OS as quantity × unit, off the matrix", () => {
    const os2 = calculateOversizedLine({
      kind: "OS_2X",
      quantity: 2,
      unitCents: 10000,
    });
    const os3 = calculateOversizedLine({
      kind: "OS_3X",
      quantity: 1,
      unitCents: 15000,
    });
    expect(os2.amountCents).toBe(20000);
    expect(os3.amountCents).toBe(15000);
    expect(normalizeOversizedKind("DOS")).toBe("OS_2X");
    expect(oversizedKindLabel("DOS")).toBe("2× oversized");
  });

  it("multiplies hourly labor by hours", () => {
    const labor = calculateLaborLine({
      description: "Headliner R&I",
      rateType: "HOURLY",
      hours: 2,
      rateCents: 8500,
      rateName: "Shop labor",
      timeName: "Headliner R&I",
    });
    expect(labor.amountCents).toBe(17000);
    expect(labor.auditNote).toContain("Shop labor $85.00");
    expect(labor.auditNote).toContain("Headliner R&I 2h");
  });

  it("uses the flat amount and records that time was not used", () => {
    const labor = calculateLaborLine({
      description: "Access flat",
      rateType: "FLAT",
      hours: 1.5,
      rateCents: 7500,
      rateName: "Flat R&I access",
    });
    expect(labor.amountCents).toBe(7500);
    expect(labor.auditNote).toContain("flat");
    expect(labor.auditNote).toContain("not used");
  });

  it("records catalog overrides in the labor audit", () => {
    const labor = calculateLaborLine({
      description: "Headliner R&I",
      rateType: "HOURLY",
      hours: 2.4,
      rateCents: 9500,
      rateName: "Shop labor",
      timeName: "Headliner R&I",
      catalogRateCents: 8500,
      catalogHours: 2,
      rateOverridden: true,
      timeOverridden: true,
    });
    expect(labor.amountCents).toBe(22800);
    expect(labor.auditNote).toContain("overridden to $95.00");
    expect(labor.auditNote).toContain("overridden to 2.4h");
  });
});

describe("calculateEstimateTotals", () => {
  it("sums matrix + markups + OS dents + labor + custom", () => {
    const panel = {
      type: "PDR_PANEL" as const,
      ...calculatePanelLine(
        {
          panelCode: "HOOD",
          dentCount: 4,
          dentSize: "DIME",
          markupCodes: ["ALUMINUM"],
        },
        matrix,
        markups,
        50,
      ),
    };
    const roof = {
      type: "PDR_PANEL" as const,
      ...calculatePanelLine(
        {
          panelCode: "ROOF",
          dentCount: 22,
          dentSize: "NICKEL",
          markupCodes: ["ALUMINUM", "HSS"],
        },
        matrix,
        markups,
        50,
      ),
    };
    const os = {
      type: "OVERSIZED" as const,
      ...calculateOversizedLine({ kind: "OS", quantity: 2, unitCents: 5000 }),
    };
    const labor = {
      type: "LABOR" as const,
      ...calculateLaborLine({
        description: "Headliner R&I",
        rateType: "HOURLY",
        hours: 2,
        rateCents: 8500,
        rateName: "Shop labor",
        timeName: "Headliner R&I",
      }),
    };
    const custom = {
      type: "CUSTOM" as const,
      ...calculateCustomLine({
        description: "Corrosion protection",
        amountCents: 2000,
      }),
    };

    const totals = calculateEstimateTotals([panel, roof, os, labor, custom]);
    expect(totals.pdrSubtotalCents).toBe(panel.baseCents + roof.baseCents);
    expect(totals.markupCents).toBe(
      panel.markupAmountCents + roof.markupAmountCents,
    );
    expect(totals.oversizedCents).toBe(10000);
    expect(totals.laborCents).toBe(17000);
    expect(totals.customCents).toBe(2000);
    expect(totals.totalCents).toBe(
      totals.pdrSubtotalCents +
        totals.markupCents +
        totals.oversizedCents +
        totals.laborCents +
        totals.customCents,
    );
    expect(totals.totalCents).toBeGreaterThan(40000);
  });

  it("adds mixed PDR, conventional, R&R, and 2×/3× OS into the right buckets", () => {
    const panel = {
      type: "PDR_PANEL" as const,
      ...calculatePanelLine(
        {
          panelCode: "HOOD",
          dentCount: 4,
          dentSize: "DIME",
          markupCodes: [],
        },
        matrix,
        markups,
        50,
      ),
    };
    const conventional = {
      type: "CONVENTIONAL" as const,
      ...calculateConventionalLine({
        panelCode: "DOOR_LF",
        notes: "Fill and blend",
        hours: 2,
        amountCents: 5000,
        hourlyRateCents: 8500,
      }),
    };
    const replace = {
      type: "REPLACE" as const,
      ...calculateReplaceLine({
        panelCode: "DECK",
        description: "OEM deck lid",
        partsCents: 42000,
        hours: 1.5,
        amountCents: 0,
        hourlyRateCents: 8500,
      }),
    };
    const os2 = {
      type: "OVERSIZED" as const,
      ...calculateOversizedLine({ kind: "OS_2X", quantity: 1, unitCents: 10000 }),
    };
    const os3 = {
      type: "OVERSIZED" as const,
      ...calculateOversizedLine({ kind: "OS_3X", quantity: 1, unitCents: 15000 }),
    };

    const totals = calculateEstimateTotals([panel, conventional, replace, os2, os3]);
    expect(conventional.amountCents).toBe(22000);
    expect(replace.amountCents).toBe(54750);
    expect(totals.pdrSubtotalCents).toBe(panel.baseCents);
    expect(totals.conventionalCents).toBe(22000);
    expect(totals.replaceCents).toBe(54750);
    expect(totals.oversizedCents).toBe(25000);
    expect(totals.totalCents).toBe(
      panel.amountCents + 22000 + 54750 + 25000,
    );
  });
});
