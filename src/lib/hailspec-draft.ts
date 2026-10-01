import type { BodyStyle } from "@/lib/body-styles";
import type { DentSize } from "@/lib/constants";
import type { EstimateDraftLine } from "@/lib/estimate-types";
import {
  CODE_TO_HS,
  HS_KEYS,
  PERCENT_ADDONS,
  RI_OPERATIONS,
  hsToShopCode,
  rangesForPanel,
  type HsKey,
  type MatrixRow,
} from "@/lib/hailspec";

export type HsPanelState = {
  selectedRange: string | null;
  size: DentSize;
  markupCodes: string[];
  os: number;
  os2x: number;
  rrEnabled: boolean;
  rrHours: number;
  convEnabled: boolean;
  convHours: number;
  laborRateCents: number;
  riEnabled: boolean;
  riTimes: Record<string, number>;
  riIncluded: Record<string, boolean>;
  riRr: Record<string, boolean>;
};

export function emptyHsPanel(laborRateCents: number, key: HsKey): HsPanelState {
  const times: Record<string, number> = {};
  const included: Record<string, boolean> = {};
  const rr: Record<string, boolean> = {};
  for (const op of RI_OPERATIONS[key]) {
    times[op.id] = op.time;
    included[op.id] = false;
    rr[op.id] = false;
  }
  return {
    selectedRange: null,
    size: "DIME",
    markupCodes: [],
    os: 0,
    os2x: 0,
    rrEnabled: false,
    rrHours: 0,
    convEnabled: false,
    convHours: 0,
    laborRateCents,
    riEnabled: false,
    riTimes: times,
    riIncluded: included,
    riRr: rr,
  };
}

export function hsPanelHasEntry(panel: HsPanelState) {
  if (panel.os > 0 || panel.os2x > 0) return true;
  if (panel.rrEnabled || panel.convEnabled) return true;
  if (panel.selectedRange) return true;
  if (panel.riEnabled && Object.values(panel.riIncluded).some(Boolean)) return true;
  return false;
}

export function flattenHsPanels(
  bodyStyle: BodyStyle,
  panels: Record<HsKey, HsPanelState>,
  rows: MatrixRow[],
): EstimateDraftLine[] {
  const lines: EstimateDraftLine[] = [];
  for (const key of HS_KEYS) {
    const panel = panels[key];
    if (!panel || !hsPanelHasEntry(panel)) continue;
    const shopCode = hsToShopCode(key, bodyStyle);
    const ranges = rangesForPanel(rows, shopCode);
    const range = ranges.find((item) => item.range === panel.selectedRange);
    const nonPdr = panel.rrEnabled || panel.convEnabled;

    if (!nonPdr && range) {
      lines.push({
        type: "PDR_PANEL",
        panelCode: shopCode,
        dentCount: range.max,
        dentSize: panel.size,
        markupCodes: panel.markupCodes.filter((code) =>
          PERCENT_ADDONS.some((addon) => addon.code === code),
        ),
        overrideBaseCents: null,
      });
    }
    if (panel.rrEnabled) {
      lines.push({
        type: "REPLACE",
        panelCode: shopCode,
        description: "Remove & Replace",
        partsCents: 0,
        hours: panel.rrHours,
        amountCents: 0,
        hourlyRateCents: panel.laborRateCents,
      });
    }
    if (panel.convEnabled) {
      lines.push({
        type: "CONVENTIONAL",
        panelCode: shopCode,
        notes: "Conventional repair",
        hours: panel.convHours,
        amountCents: 0,
        hourlyRateCents: panel.laborRateCents,
      });
    }
    if (panel.os > 0) {
      lines.push({
        type: "OVERSIZED",
        kind: "OS",
        quantity: panel.os,
        overrideUnitCents: null,
        panelCode: shopCode,
      });
    }
    if (panel.os2x > 0) {
      lines.push({
        type: "OVERSIZED",
        kind: "OS_2X",
        quantity: panel.os2x,
        overrideUnitCents: null,
        panelCode: shopCode,
      });
    }
    if (panel.riEnabled) {
      for (const op of RI_OPERATIONS[key]) {
        if (!panel.riIncluded[op.id]) continue;
        const hours = panel.riTimes[op.id] ?? op.time;
        if (hours <= 0) continue;
        const prefix = panel.riRr[op.id] ? "R&R" : "R&I";
        lines.push({
          type: "LABOR",
          description: `${prefix}: ${op.name}`,
          laborTimeId: null,
          laborRateId: null,
          hours,
          rateCents: panel.laborRateCents,
          rateType: "HOURLY",
          quantity: 1,
          panelCode: shopCode,
        });
      }
    }
  }
  return lines;
}

export function inflateHsPanels(
  lines: EstimateDraftLine[],
  bodyStyle: BodyStyle,
  rows: MatrixRow[],
  defaultRateCents: number,
): Record<HsKey, HsPanelState> {
  const panels = {} as Record<HsKey, HsPanelState>;
  for (const key of HS_KEYS) {
    panels[key] = emptyHsPanel(defaultRateCents, key);
  }

  for (const line of lines) {
    const code =
      line.type === "LABOR"
        ? line.panelCode
        : line.type === "OVERSIZED"
          ? line.panelCode
          : line.type === "PDR_PANEL" ||
              line.type === "CONVENTIONAL" ||
              line.type === "REPLACE"
            ? line.panelCode
            : null;
    const key = code ? CODE_TO_HS[code] : undefined;
    if (!key) continue;
    const panel = panels[key];
    const shopCode = hsToShopCode(key, bodyStyle);
    const ranges = rangesForPanel(rows, shopCode);

    if (line.type === "PDR_PANEL") {
      const range = ranges.find(
        (item) => line.dentCount >= item.min && line.dentCount <= item.max,
      );
      panel.selectedRange = range?.range ?? null;
      panel.size = line.dentSize;
      panel.markupCodes = line.markupCodes;
    } else if (line.type === "CONVENTIONAL") {
      panel.convEnabled = true;
      panel.convHours = line.hours;
      if (line.hourlyRateCents) panel.laborRateCents = line.hourlyRateCents;
    } else if (line.type === "REPLACE") {
      panel.rrEnabled = true;
      panel.rrHours = line.hours;
      if (line.hourlyRateCents) panel.laborRateCents = line.hourlyRateCents;
    } else if (line.type === "OVERSIZED") {
      if (line.kind === "OS_2X") panel.os2x += line.quantity;
      else if (line.kind === "OS") panel.os += line.quantity;
    } else if (line.type === "LABOR") {
      panel.riEnabled = true;
      panel.laborRateCents = line.rateCents || panel.laborRateCents;
      const match = /^(R&R|R&I):\s*(.+)$/.exec(line.description);
      const opName = match?.[2] ?? line.description;
      const op = RI_OPERATIONS[key].find((item) => item.name === opName);
      if (op) {
        panel.riIncluded[op.id] = true;
        panel.riTimes[op.id] = line.hours;
        panel.riRr[op.id] = match?.[1] === "R&R";
      }
    }
  }

  return panels;
}
