import { hailSpecPercentCents } from "@/lib/estimate-calc";
import {
  DEFAULT_LABOR_RATE_CENTS,
  DOUBLE_OS_CENTS,
  OS_DENT_CENTS,
  RI_OPERATIONS,
  rangesForPanel,
  sizePrice,
  type HsKey,
  type MatrixRow,
} from "@/lib/hailspec";
import type { HsPanelState } from "@/lib/hailspec-draft";

export function lookupHsPrice(
  rows: MatrixRow[],
  panel: HsKey,
  count: number,
  size: HsPanelState["size"],
) {
  if (!count || count <= 0) return 0;
  const range = rangesForPanel(rows, panel).find((row) => count >= row.min && count <= row.max);
  return range ? sizePrice(range, size) : 0;
}

export function calculateHsPanel(
  key: HsKey,
  panel: HsPanelState,
  rows: MatrixRow[],
  markups: { code: string; name: string; percent: number }[],
) {
  const ranges = rangesForPanel(rows, key);
  const range = ranges.find((item) => item.range === panel.selectedRange);
  const nonPdr = panel.rrEnabled || panel.convEnabled;
  const baseCents = !nonPdr && range ? sizePrice(range, panel.size) : 0;
  const addonCents = nonPdr
    ? 0
    : markups
        .filter((rule) => panel.markupCodes.includes(rule.code))
        .reduce((sum, rule) => sum + hailSpecPercentCents(baseCents, rule.percent), 0) +
      panel.os * OS_DENT_CENTS +
      panel.os2x * DOUBLE_OS_CENTS;
  const rate = panel.laborRateCents || DEFAULT_LABOR_RATE_CENTS;
  const rrCents = panel.rrEnabled ? Math.round(panel.rrHours * rate) : 0;
  const convCents = panel.convEnabled ? Math.round(panel.convHours * rate) : 0;
  const riHours = panel.riEnabled
    ? RI_OPERATIONS[key].reduce(
        (sum, op) => sum + (panel.riIncluded[op.id] ? panel.riTimes[op.id] ?? op.time : 0),
        0,
      )
    : 0;
  const riCents = Math.round(riHours * rate);
  const pdrCents = nonPdr ? 0 : baseCents + addonCents;
  return {
    baseCents,
    addonCents,
    rrCents,
    convCents,
    riHours,
    riCents,
    pdrCents,
    totalCents: pdrCents + rrCents + convCents + riCents,
    count: nonPdr ? 0 : range?.max ?? 0,
  };
}
