import { describe, expect, it } from "vitest";
import { emptyPanel, flattenPanels, inflateFromLines, panelHasEntry } from "@/lib/panel-draft";

describe("panel draft flatten", () => {
  it("emits PDR, conventional, R&R, and OS lines for filled panels only", () => {
    const hood = emptyPanel();
    hood.method = "PDR";
    hood.dentCount = 4;
    hood.os = 1;

    const door = emptyPanel();
    door.method = "CONVENTIONAL";
    door.convHours = 2;
    door.convNotes = "Blend";

    const deck = emptyPanel();
    deck.method = "REPLACE";
    deck.replaceDesc = "OEM";
    deck.replacePartsCents = 10000;

    const lines = flattenPanels(
      "CAR",
      { HOOD: hood, DOOR_LF: door, DECK: deck, ROOF: emptyPanel() },
      { os: 0, os2x: 1, os3x: 0 },
    );

    expect(lines.filter((line) => line.type === "PDR_PANEL")).toHaveLength(1);
    expect(lines.filter((line) => line.type === "CONVENTIONAL")).toHaveLength(1);
    expect(lines.filter((line) => line.type === "REPLACE")).toHaveLength(1);
    expect(lines.filter((line) => line.type === "OVERSIZED")).toHaveLength(2);
    expect(panelHasEntry(emptyPanel())).toBe(false);
    expect(panelHasEntry(hood)).toBe(true);
  });

  it("round-trips OS kinds including legacy 2× mapping", () => {
    const { panels, globalOs } = inflateFromLines([
      { type: "OVERSIZED", kind: "OS_2X", quantity: 2, overrideUnitCents: null, panelCode: "ROOF" },
      { type: "OVERSIZED", kind: "OS_3X", quantity: 1, overrideUnitCents: null, panelCode: null },
    ]);
    expect(panels.ROOF.os2x).toBe(2);
    expect(globalOs.os3x).toBe(1);
  });
});
