import { DENT_SIZE_LABELS, dentBandLabel, panelLabel, type DentSize } from "./constants";

export type MatrixRowInput = {
  id?: string;
  panelCode: string;
  panelLabel?: string;
  minDents: number;
  maxDents: number | null;
  dimeCents: number;
  nickelCents: number;
  quarterCents: number;
  halfDollarCents: number;
};

export type MarkupInput = {
  code: string;
  name: string;
  percent: number;
};

export type LookupResult = {
  found: boolean;
  amountCents: number;
  row: MatrixRowInput | null;
  label: string;
};

export function lookupMatrixAmount(
  rows: MatrixRowInput[],
  panelCode: string,
  dentCount: number,
  dentSize: DentSize,
): LookupResult {
  const row = rows.find(
    (candidate) =>
      candidate.panelCode === panelCode &&
      dentCount >= candidate.minDents &&
      (candidate.maxDents == null || dentCount <= candidate.maxDents),
  );

  if (!row) {
    return {
      found: false,
      amountCents: 0,
      row: null,
      label: `${panelLabel(panelCode)} · ${dentCount} dents · ${DENT_SIZE_LABELS[dentSize]} (no matrix row)`,
    };
  }

  const amountCents =
    dentSize === "DIME"
      ? row.dimeCents
      : dentSize === "NICKEL"
        ? row.nickelCents
        : dentSize === "QUARTER"
          ? row.quarterCents
          : row.halfDollarCents;

  return {
    found: true,
    amountCents,
    row,
    label: `${row.panelLabel ?? panelLabel(panelCode)} · ${dentBandLabel(row.minDents, row.maxDents)} · ${DENT_SIZE_LABELS[dentSize]}`,
  };
}

export function combinedMarkupPercent(
  selected: Pick<MarkupInput, "percent">[],
  maxCombinedPercent: number,
) {
  const raw = selected.reduce((sum, item) => sum + (item.percent || 0), 0);
  const applied = Math.min(raw, maxCombinedPercent);
  return {
    rawPercent: raw,
    appliedPercent: applied,
    capped: raw > maxCombinedPercent,
  };
}

export type PanelLineInput = {
  panelCode: string;
  dentCount: number;
  dentSize: DentSize;
  markupCodes: string[];
  overrideBaseCents?: number | null;
};

export type PanelLineResult = {
  description: string;
  lookupLabel: string;
  found: boolean;
  baseCents: number;
  usedOverride: boolean;
  markupPercentApplied: number;
  markupAmountCents: number;
  amountCents: number;
  markupSummary: string;
};

export function calculatePanelLine(
  input: PanelLineInput,
  rows: MatrixRowInput[],
  markups: MarkupInput[],
  maxCombinedPercent: number,
): PanelLineResult {
  const lookup = lookupMatrixAmount(
    rows,
    input.panelCode,
    input.dentCount,
    input.dentSize,
  );
  const usedOverride =
    input.overrideBaseCents != null && Number.isFinite(input.overrideBaseCents);
  const baseCents = usedOverride ? Math.round(input.overrideBaseCents!) : lookup.amountCents;
  const selected = markups.filter((rule) => input.markupCodes.includes(rule.code));
  // HailSpec: each percent add-on is rounded on the dollar base independently. No combined cap.
  void maxCombinedPercent;
  let markupAmountCents = 0;
  for (const rule of selected) {
    markupAmountCents += hailSpecPercentCents(baseCents, rule.percent);
  }
  const appliedPercent = selected.reduce((sum, rule) => sum + rule.percent, 0);
  const names = selected.map((rule) => `${rule.name} ${rule.percent}%`);
  const markupSummary = selected.length
    ? `${names.join(" + ")} = ${appliedPercent}% of base (each add-on rounded)`
    : "No panel markups";

  return {
    description: `${panelLabel(input.panelCode)} · ${input.dentCount} ${DENT_SIZE_LABELS[input.dentSize].toLowerCase()} dent${input.dentCount === 1 ? "" : "s"}`,
    lookupLabel: lookup.label,
    found: lookup.found || usedOverride,
    baseCents,
    usedOverride,
    markupPercentApplied: appliedPercent,
    markupAmountCents,
    amountCents: baseCents + markupAmountCents,
    markupSummary,
  };
}

export type OversizedKind = "OS" | "DOS" | "OS_2X" | "OS_3X";

export function normalizeOversizedKind(kind: string | null | undefined): "OS" | "OS_2X" | "OS_3X" {
  if (kind === "OS_3X") return "OS_3X";
  if (kind === "OS_2X" || kind === "DOS") return "OS_2X";
  return "OS";
}

export function oversizedKindLabel(kind: string | null | undefined) {
  const normalized = normalizeOversizedKind(kind);
  if (normalized === "OS_3X") return "3× oversized";
  if (normalized === "OS_2X") return "2× oversized";
  return "Oversized (OS)";
}

export function oversizedUnitCents(
  kind: string | null | undefined,
  settings: {
    oversizedOsCents: number;
    oversizedDosCents: number;
    oversizedTripleCents: number;
  },
) {
  const normalized = normalizeOversizedKind(kind);
  if (normalized === "OS_3X") return settings.oversizedTripleCents;
  if (normalized === "OS_2X") return settings.oversizedDosCents;
  return settings.oversizedOsCents;
}

export type OversizedLineInput = {
  kind: OversizedKind;
  quantity: number;
  unitCents: number;
};

export function calculateOversizedLine(input: OversizedLineInput) {
  const quantity = Math.max(0, Math.round(input.quantity));
  const unitCents = Math.max(0, Math.round(input.unitCents));
  const label = oversizedKindLabel(input.kind);
  return {
    description: `${label} · ${quantity} dent${quantity === 1 ? "" : "s"}`,
    quantity,
    unitAmountCents: unitCents,
    amountCents: quantity * unitCents,
  };
}

export type ConventionalLineInput = {
  panelCode: string;
  notes?: string;
  hours: number;
  amountCents: number;
  hourlyRateCents: number;
};

export function calculateConventionalLine(input: ConventionalLineInput) {
  const hours = Number.isFinite(input.hours) ? Math.max(0, input.hours) : 0;
  const hourlyRateCents = Math.max(0, Math.round(input.hourlyRateCents || 0));
  const flatCents = Math.max(0, Math.round(input.amountCents || 0));
  const laborCents = Math.round(hours * hourlyRateCents);
  const note = input.notes?.trim();
  return {
    description: `${panelLabel(input.panelCode)} · Conventional${note ? ` · ${note}` : ""}`,
    hours,
    laborCents,
    flatCents,
    amountCents: laborCents + flatCents,
  };
}

export type ReplaceLineInput = {
  panelCode: string;
  description?: string;
  partsCents: number;
  hours: number;
  amountCents: number;
  hourlyRateCents: number;
};

export function calculateReplaceLine(input: ReplaceLineInput) {
  const hours = Number.isFinite(input.hours) ? Math.max(0, input.hours) : 0;
  const hourlyRateCents = Math.max(0, Math.round(input.hourlyRateCents || 0));
  const partsCents = Math.max(0, Math.round(input.partsCents || 0));
  const laborFlatCents = Math.max(0, Math.round(input.amountCents || 0));
  const laborCents = Math.round(hours * hourlyRateCents) + laborFlatCents;
  const detail = input.description?.trim();
  return {
    description: `${panelLabel(input.panelCode)} · R&R${detail ? ` · ${detail}` : ""}`,
    hours,
    partsCents,
    laborCents,
    amountCents: partsCents + laborCents,
  };
}

export type LaborLineInput = {
  description: string;
  rateType: "HOURLY" | "FLAT";
  hours: number;
  rateCents: number;
  rateName?: string | null;
  timeName?: string | null;
  catalogRateCents?: number | null;
  catalogHours?: number | null;
  rateOverridden?: boolean;
  timeOverridden?: boolean;
};

export function calculateLaborLine(input: LaborLineInput) {
  const hours = Number.isFinite(input.hours) ? Math.max(0, input.hours) : 0;
  const rateCents = Math.max(0, Math.round(input.rateCents));
  const amountCents =
    input.rateType === "FLAT" ? rateCents : Math.round(hours * rateCents);
  return {
    description: input.description,
    hours,
    rateCents,
    rateType: input.rateType,
    amountCents,
    auditNote: buildLaborAudit({ ...input, hours, rateCents }),
  };
}

export function buildLaborAudit(input: LaborLineInput) {
  const parts: string[] = [];
  const rateLabel = formatCents(input.rateCents);
  if (input.rateName) {
    if (input.rateOverridden && input.catalogRateCents != null) {
      parts.push(
        `Rate: ${input.rateName} catalog ${formatCents(input.catalogRateCents)} overridden to ${rateLabel} (${input.rateType.toLowerCase()})`,
      );
    } else {
      parts.push(`Rate: ${input.rateName} ${rateLabel} (${input.rateType.toLowerCase()})`);
    }
  } else {
    parts.push(`Rate: custom ${rateLabel} (${input.rateType.toLowerCase()})`);
  }

  if (input.rateType === "HOURLY") {
    if (input.timeName) {
      if (input.timeOverridden && input.catalogHours != null) {
        parts.push(
          `Time: ${input.timeName} catalog ${trimHours(input.catalogHours)}h overridden to ${trimHours(input.hours)}h`,
        );
      } else {
        parts.push(`Time: ${input.timeName} ${trimHours(input.hours)}h`);
      }
    } else {
      parts.push(`Time: ${trimHours(input.hours)}h (manual)`);
    }
  } else {
    parts.push("Time: not used (flat rate)");
  }

  return parts.join(" · ");
}

export type CustomLineInput = {
  description: string;
  amountCents: number;
};

export function calculateCustomLine(input: CustomLineInput) {
  return {
    description: input.description || "Custom line",
    amountCents: Math.round(input.amountCents || 0),
  };
}

export type CalculatedLine =
  | ({ type: "PDR_PANEL" } & PanelLineResult)
  | ({ type: "OVERSIZED" } & ReturnType<typeof calculateOversizedLine>)
  | ({ type: "LABOR" } & ReturnType<typeof calculateLaborLine>)
  | ({ type: "CUSTOM" } & ReturnType<typeof calculateCustomLine>)
  | ({ type: "CONVENTIONAL" } & ReturnType<typeof calculateConventionalLine>)
  | ({ type: "REPLACE" } & ReturnType<typeof calculateReplaceLine>);

export type EstimateTotals = {
  pdrSubtotalCents: number;
  markupCents: number;
  oversizedCents: number;
  laborCents: number;
  customCents: number;
  conventionalCents: number;
  replaceCents: number;
  totalCents: number;
};

export function calculateEstimateTotals(lines: CalculatedLine[]): EstimateTotals {
  let pdrSubtotalCents = 0;
  let markupCents = 0;
  let oversizedCents = 0;
  let laborCents = 0;
  let customCents = 0;
  let conventionalCents = 0;
  let replaceCents = 0;

  for (const line of lines) {
    if (line.type === "PDR_PANEL") {
      pdrSubtotalCents += line.baseCents;
      markupCents += line.markupAmountCents;
    } else if (line.type === "OVERSIZED") {
      oversizedCents += line.amountCents;
    } else if (line.type === "LABOR") {
      laborCents += line.amountCents;
    } else if (line.type === "CONVENTIONAL") {
      conventionalCents += line.amountCents;
    } else if (line.type === "REPLACE") {
      replaceCents += line.amountCents;
    } else {
      customCents += line.amountCents;
    }
  }

  return {
    pdrSubtotalCents,
    markupCents,
    oversizedCents,
    laborCents,
    customCents,
    conventionalCents,
    replaceCents,
    totalCents:
      pdrSubtotalCents +
      markupCents +
      oversizedCents +
      laborCents +
      customCents +
      conventionalCents +
      replaceCents,
  };
}

/** HailSpec: Math.round(baseDollars * pct) then back to cents. */
export function hailSpecPercentCents(baseCents: number, percent: number) {
  const dollars = Math.round(baseCents || 0) / 100;
  return Math.round(dollars * (percent / 100)) * 100;
}

function formatCents(cents: number) {
  return `$${(Math.round(cents || 0) / 100).toFixed(2)}`;
}

function trimHours(hours: number) {
  return Number(hours.toFixed(2)).toString();
}
