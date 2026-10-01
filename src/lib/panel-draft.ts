import { BODY_PANELS, isBodyStyle, type BodyStyle } from "@/lib/body-styles";
import type { DentSize } from "@/lib/constants";
import type { EstimateDraftLine } from "@/lib/estimate-types";

export type PanelMethod = "NONE" | "PDR" | "CONVENTIONAL" | "REPLACE";

export type PanelDraft = {
  method: PanelMethod;
  dentCount: number;
  dentSize: DentSize;
  markupCodes: string[];
  overrideBaseCents: number | null;
  convNotes: string;
  convHours: number;
  convAmountCents: number;
  replaceDesc: string;
  replacePartsCents: number;
  replaceHours: number;
  replaceAmountCents: number;
  os: number;
  os2x: number;
  os3x: number;
};

export type OsCounts = {
  os: number;
  os2x: number;
  os3x: number;
};

export function emptyPanel(): PanelDraft {
  return {
    method: "NONE",
    dentCount: 0,
    dentSize: "DIME",
    markupCodes: [],
    overrideBaseCents: null,
    convNotes: "",
    convHours: 0,
    convAmountCents: 0,
    replaceDesc: "",
    replacePartsCents: 0,
    replaceHours: 0,
    replaceAmountCents: 0,
    os: 0,
    os2x: 0,
    os3x: 0,
  };
}

export function emptyOs(): OsCounts {
  return { os: 0, os2x: 0, os3x: 0 };
}

export function panelHasEntry(panel: PanelDraft) {
  if (panel.os > 0 || panel.os2x > 0 || panel.os3x > 0) return true;
  if (panel.method === "PDR" && panel.dentCount > 0) return true;
  if (
    panel.method === "CONVENTIONAL" &&
    (panel.convNotes.trim() || panel.convHours > 0 || panel.convAmountCents > 0)
  ) {
    return true;
  }
  if (
    panel.method === "REPLACE" &&
    (panel.replaceDesc.trim() ||
      panel.replacePartsCents > 0 ||
      panel.replaceHours > 0 ||
      panel.replaceAmountCents > 0)
  ) {
    return true;
  }
  return false;
}

export function flattenPanels(
  bodyStyle: BodyStyle,
  panels: Record<string, PanelDraft>,
  globalOs: OsCounts,
): EstimateDraftLine[] {
  const lines: EstimateDraftLine[] = [];
  const codes = new Set(BODY_PANELS[bodyStyle]);

  for (const code of BODY_PANELS[bodyStyle]) {
    const panel = panels[code] ?? emptyPanel();
    if (panel.method === "PDR" && panel.dentCount > 0) {
      lines.push({
        type: "PDR_PANEL",
        panelCode: code,
        dentCount: panel.dentCount,
        dentSize: panel.dentSize,
        markupCodes: panel.markupCodes,
        overrideBaseCents: panel.overrideBaseCents,
      });
    }
    if (
      panel.method === "CONVENTIONAL" &&
      (panel.convNotes.trim() || panel.convHours > 0 || panel.convAmountCents > 0)
    ) {
      lines.push({
        type: "CONVENTIONAL",
        panelCode: code,
        notes: panel.convNotes,
        hours: panel.convHours,
        amountCents: panel.convAmountCents,
      });
    }
    if (
      panel.method === "REPLACE" &&
      (panel.replaceDesc.trim() ||
        panel.replacePartsCents > 0 ||
        panel.replaceHours > 0 ||
        panel.replaceAmountCents > 0)
    ) {
      lines.push({
        type: "REPLACE",
        panelCode: code,
        description: panel.replaceDesc,
        partsCents: panel.replacePartsCents,
        hours: panel.replaceHours,
        amountCents: panel.replaceAmountCents,
      });
    }
    pushOs(lines, code, panel);
  }

  for (const [code, panel] of Object.entries(panels)) {
    if (codes.has(code)) continue;
    pushOs(lines, code, panel);
  }

  pushOs(lines, null, globalOs);
  return lines;
}

function pushOs(
  lines: EstimateDraftLine[],
  panelCode: string | null,
  counts: Pick<PanelDraft, "os" | "os2x" | "os3x">,
) {
  if (counts.os > 0) {
    lines.push({
      type: "OVERSIZED",
      kind: "OS",
      quantity: counts.os,
      overrideUnitCents: null,
      panelCode,
    });
  }
  if (counts.os2x > 0) {
    lines.push({
      type: "OVERSIZED",
      kind: "OS_2X",
      quantity: counts.os2x,
      overrideUnitCents: null,
      panelCode,
    });
  }
  if (counts.os3x > 0) {
    lines.push({
      type: "OVERSIZED",
      kind: "OS_3X",
      quantity: counts.os3x,
      overrideUnitCents: null,
      panelCode,
    });
  }
}

export function inflateFromLines(lines: EstimateDraftLine[]): {
  bodyStyleHint: BodyStyle | null;
  panels: Record<string, PanelDraft>;
  globalOs: OsCounts;
} {
  const panels: Record<string, PanelDraft> = {};
  const globalOs = emptyOs();

  function panel(code: string) {
    if (!panels[code]) panels[code] = emptyPanel();
    return panels[code];
  }

  for (const line of lines) {
    if (line.type === "PDR_PANEL") {
      const next = panel(line.panelCode);
      next.method = "PDR";
      next.dentCount = line.dentCount;
      next.dentSize = line.dentSize;
      next.markupCodes = line.markupCodes;
      next.overrideBaseCents = line.overrideBaseCents;
    } else if (line.type === "CONVENTIONAL") {
      const next = panel(line.panelCode);
      if (next.method === "NONE") next.method = "CONVENTIONAL";
      next.convNotes = line.notes;
      next.convHours = line.hours;
      next.convAmountCents = line.amountCents;
    } else if (line.type === "REPLACE") {
      const next = panel(line.panelCode);
      if (next.method === "NONE") next.method = "REPLACE";
      next.replaceDesc = line.description;
      next.replacePartsCents = line.partsCents;
      next.replaceHours = line.hours;
      next.replaceAmountCents = line.amountCents;
    } else if (line.type === "OVERSIZED") {
      const target =
        line.panelCode && line.panelCode !== "_GLOBAL"
          ? panel(line.panelCode)
          : globalOs;
      if (line.kind === "OS_3X") target.os3x += line.quantity;
      else if (line.kind === "OS_2X") target.os2x += line.quantity;
      else target.os += line.quantity;
    }
  }

  return { bodyStyleHint: null, panels, globalOs };
}

export function resolveBodyStyle(value: string | null | undefined): BodyStyle {
  return isBodyStyle(value) ? value : "CAR";
}
