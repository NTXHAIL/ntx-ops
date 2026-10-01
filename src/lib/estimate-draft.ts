import { resolveBodyStyle } from "@/lib/panel-draft";
import type { DentSize } from "@/lib/constants";
import { normalizeOversizedKind } from "@/lib/estimate-calc";
import type { EstimateDraftLine, EstimateDraftPayload } from "@/lib/estimate-types";

type LineRecord = {
  type: string;
  panelCode: string | null;
  dentCount: number | null;
  dentSize: string | null;
  oversizedKind: string | null;
  quantity: number;
  markupCodesJson: string;
  matrixAmountCents: number | null;
  unitAmountCents: number;
  amountCents: number;
  partsCents?: number | null;
  notes: string | null;
  laborRateId: string | null;
  laborTimeId: string | null;
  laborHours: number | null;
  laborRateCents: number | null;
  rateType: string | null;
  description: string;
};

export function estimateToDraft(estimate: {
  id: string;
  customerId: string;
  vehicleId: string | null;
  claimId: string | null;
  notes: string | null;
  bodyStyle?: string | null;
  carrierId?: string | null;
  lineItems: LineRecord[];
}): EstimateDraftPayload {
  return {
    id: estimate.id,
    customerId: estimate.customerId,
    vehicleId: estimate.vehicleId,
    claimId: estimate.claimId,
    notes: estimate.notes ?? "",
    bodyStyle: resolveBodyStyle(estimate.bodyStyle),
    carrierId: estimate.carrierId || "state_farm",
    lines: estimate.lineItems.map(toDraftLine),
  };
}

function toDraftLine(item: LineRecord): EstimateDraftLine {
  if (item.type === "PDR_PANEL") {
    let markupCodes: string[] = [];
    try {
      markupCodes = JSON.parse(item.markupCodesJson || "[]");
    } catch {
      markupCodes = [];
    }
    return {
      type: "PDR_PANEL",
      panelCode: item.panelCode || "HOOD",
      dentCount: item.dentCount || 1,
      dentSize: (item.dentSize as DentSize) || "DIME",
      markupCodes,
      overrideBaseCents: item.notes === "override" ? item.matrixAmountCents : null,
    };
  }
  if (item.type === "OVERSIZED") {
    return {
      type: "OVERSIZED",
      kind: normalizeOversizedKind(item.oversizedKind),
      quantity: item.quantity || 1,
      overrideUnitCents: item.notes === "override" ? item.unitAmountCents : null,
      panelCode: item.panelCode,
    };
  }
  if (item.type === "LABOR") {
    return {
      type: "LABOR",
      description: item.description,
      laborTimeId: item.laborTimeId,
      laborRateId: item.laborRateId,
      hours: item.laborHours ?? 0,
      rateCents: item.laborRateCents ?? 0,
      rateType: item.rateType === "FLAT" ? "FLAT" : "HOURLY",
      quantity: item.quantity || 1,
      panelCode: item.panelCode,
    };
  }
  if (item.type === "CONVENTIONAL") {
    return {
      type: "CONVENTIONAL",
      panelCode: item.panelCode || "HOOD",
      notes: item.notes ?? "",
      hours: item.laborHours ?? 0,
      amountCents: item.unitAmountCents || 0,
    };
  }
  if (item.type === "REPLACE") {
    return {
      type: "REPLACE",
      panelCode: item.panelCode || "HOOD",
      description: item.description.replace(/^.*? · R&R(?: · )?/, ""),
      partsCents: item.partsCents ?? 0,
      hours: item.laborHours ?? 0,
      amountCents: item.unitAmountCents || 0,
    };
  }
  return {
    type: "CUSTOM",
    description: item.description,
    amountCents: item.amountCents,
  };
}
