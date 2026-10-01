import { describe, expect, it } from "vitest";
import { hailSpecPercentCents } from "@/lib/estimate-calc";
import { emptyHsPanel } from "@/lib/hailspec-draft";
import { buildStateFarmMatrixRows } from "@/lib/hailspec-matrix";
import { calculateHsPanel, lookupHsPrice } from "@/lib/hailspec-price";
import { buildReportSections } from "@/lib/hailspec-report";
import { DEFAULT_LABOR_RATE_CENTS, HS_KEYS } from "@/lib/hailspec";

const rows = buildStateFarmMatrixRows();
const markups = [
  { code: "ALUMINUM", name: "Aluminum", percent: 25 },
  { code: "HSS", name: "HSS", percent: 25 },
  { code: "DOUBLE_PANEL", name: "Double Panel", percent: 25 },
  { code: "LIMITED_ACCESS", name: "Limited Access", percent: 20 },
  { code: "TALL_VEHICLE", name: "Tall Vehicle", percent: 25 },
  { code: "LARGE_ROOF", name: "XL Panel", percent: 25 },
];

describe("State Farm matrix lookup", () => {
  it("prices hood 16-30 dime at $200", () => {
    expect(lookupHsPrice(rows, "HOOD", 30, "DIME")).toBe(20000);
  });

  it("returns 0 for a cell marked conventional / R&R", () => {
    expect(lookupHsPrice(rows, "HOOD", 150, "QUARTER")).toBe(0);
  });

  it("prices roof 1-5 half dollar at $200", () => {
    expect(lookupHsPrice(rows, "ROOF", 4, "HALF_DOLLAR")).toBe(20000);
  });
});

describe("HailSpec add-ons", () => {
  it("rounds each percent add-on on the dollar base independently (no cap)", () => {
    expect(hailSpecPercentCents(20000, 25)).toBe(5000);
    expect(hailSpecPercentCents(20000, 20)).toBe(4000);
    const panel = emptyHsPanel(DEFAULT_LABOR_RATE_CENTS, "HOOD");
    panel.selectedRange = "16 - 30";
    panel.size = "DIME";
    panel.markupCodes = ["ALUMINUM", "HSS", "DOUBLE_PANEL"];
    const priced = calculateHsPanel("HOOD", panel, rows, markups);
    expect(priced.baseCents).toBe(20000);
    expect(priced.addonCents).toBe(15000);
    expect(priced.totalCents).toBe(35000);
  });

  it("prices oversized dents at $50 and double OS at $100", () => {
    const panel = emptyHsPanel(DEFAULT_LABOR_RATE_CENTS, "HOOD");
    panel.selectedRange = "1 - 5";
    panel.size = "DIME";
    panel.os = 2;
    panel.os2x = 1;
    const priced = calculateHsPanel("HOOD", panel, rows, markups);
    expect(priced.baseCents).toBe(8000);
    expect(priced.addonCents).toBe(20000);
    expect(priced.totalCents).toBe(28000);
  });
});

describe("R&R, Conventional, R&I", () => {
  it("prices R&R as hours × $60", () => {
    const panel = emptyHsPanel(DEFAULT_LABOR_RATE_CENTS, "HOOD");
    panel.rrEnabled = true;
    panel.rrHours = 2.5;
    const priced = calculateHsPanel("HOOD", panel, rows, markups);
    expect(priced.rrCents).toBe(15000);
    expect(priced.pdrCents).toBe(0);
    expect(priced.totalCents).toBe(15000);
  });

  it("prices conventional the same way", () => {
    const panel = emptyHsPanel(DEFAULT_LABOR_RATE_CENTS, "LFD");
    panel.convEnabled = true;
    panel.convHours = 1.5;
    expect(calculateHsPanel("LFD", panel, rows, markups).convCents).toBe(9000);
  });

  it("prices included R&I ops at the panel labor rate", () => {
    const panel = emptyHsPanel(DEFAULT_LABOR_RATE_CENTS, "ROOF");
    panel.selectedRange = "1 - 5";
    panel.size = "DIME";
    panel.riEnabled = true;
    panel.riIncluded.headliner = true;
    panel.riTimes.headliner = 3;
    const priced = calculateHsPanel("ROOF", panel, rows, markups);
    expect(priced.baseCents).toBe(10000);
    expect(priced.riCents).toBe(18000);
    expect(priced.totalCents).toBe(28000);
  });
});

describe("grand total + report lines", () => {
  it("sums panels and emits numbered report lines", () => {
    const hood = emptyHsPanel(DEFAULT_LABOR_RATE_CENTS, "HOOD");
    hood.selectedRange = "16 - 30";
    hood.size = "DIME";
    hood.markupCodes = ["ALUMINUM"];
    hood.os = 1;
    const roof = emptyHsPanel(DEFAULT_LABOR_RATE_CENTS, "ROOF");
    roof.rrEnabled = true;
    roof.rrHours = 2;
    roof.riEnabled = true;
    roof.riIncluded.headliner = true;
    const panels = Object.fromEntries(HS_KEYS.map((key) => [key, emptyHsPanel(DEFAULT_LABOR_RATE_CENTS, key)])) as Record<
      (typeof HS_KEYS)[number],
      ReturnType<typeof emptyHsPanel>
    >;
    panels.HOOD = hood;
    panels.ROOF = roof;
    const hoodTotal = calculateHsPanel("HOOD", hood, rows, markups).totalCents;
    const roofTotal = calculateHsPanel("ROOF", roof, rows, markups).totalCents;
    expect(hoodTotal + roofTotal).toBe(20000 + 5000 + 5000 + 12000 + 18000);

    const report = buildReportSections(panels, markups, ["HOOD", "ROOF"], rows);
    expect(report.sections).toHaveLength(2);
    expect(report.sections[0].lines[0].label).toContain("PDR");
    expect(report.sections[0].lines.some((line) => line.label.includes("Aluminum"))).toBe(true);
    expect(report.sections[1].lines[0].label).toContain("R&R");
    expect(report.totalPriceCents + report.totalLaborCents).toBeGreaterThan(0);
  });
});
