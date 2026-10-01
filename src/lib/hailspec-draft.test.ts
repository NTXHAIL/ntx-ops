import { describe, expect, it } from "vitest";
import { flattenHsPanels, hsPanelHasEntry, inflateHsPanels } from "@/lib/hailspec-draft";
import { emptyHsPanel } from "@/lib/hailspec-draft";
import { buildStateFarmMatrixRows } from "@/lib/hailspec-matrix";

const rows = buildStateFarmMatrixRows();

describe("HailSpec panel draft", () => {
  it("flattens PDR range + OS + R&I into shop lines", () => {
    const hood = emptyHsPanel(8500, "HOOD");
    hood.selectedRange = "1 - 5";
    hood.size = "DIME";
    hood.markupCodes = ["ALUMINUM"];
    hood.os = 2;
    hood.riEnabled = true;
    hood.riIncluded.front_bumper = true;
    hood.riTimes.front_bumper = 1;

    const lines = flattenHsPanels("CAR", { ...inflateHsPanels([], "CAR", rows, 8500), HOOD: hood }, rows);
    expect(lines.some((line) => line.type === "PDR_PANEL" && line.dentCount === 5)).toBe(true);
    expect(lines.some((line) => line.type === "OVERSIZED" && line.kind === "OS" && line.quantity === 2)).toBe(true);
    expect(lines.some((line) => line.type === "LABOR" && line.description === "R&I: Front Bumper")).toBe(true);
    expect(hsPanelHasEntry(hood)).toBe(true);
  });

  it("treats R&R with zero hours as an entered panel", () => {
    const hood = emptyHsPanel(8500, "HOOD");
    hood.rrEnabled = true;
    expect(hsPanelHasEntry(hood)).toBe(true);
    const lines = flattenHsPanels("CAR", { ...inflateHsPanels([], "CAR", rows, 8500), HOOD: hood }, rows);
    expect(lines.some((line) => line.type === "REPLACE")).toBe(true);
  });
});
