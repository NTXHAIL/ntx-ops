import type { BodyStyle } from "@/lib/body-styles";
import type { DentSize } from "@/lib/constants";

export type OversizedKindDraft = "OS" | "OS_2X" | "OS_3X";

export type EstimateDraftLine =
  | {
      type: "PDR_PANEL";
      panelCode: string;
      dentCount: number;
      dentSize: DentSize;
      markupCodes: string[];
      overrideBaseCents: number | null;
    }
  | {
      type: "OVERSIZED";
      kind: OversizedKindDraft;
      quantity: number;
      overrideUnitCents: number | null;
      panelCode?: string | null;
    }
  | {
      type: "LABOR";
      description: string;
      laborTimeId: string | null;
      laborRateId: string | null;
      hours: number;
      rateCents: number;
      rateType: "HOURLY" | "FLAT";
      quantity: number;
      panelCode?: string | null;
    }
  | {
      type: "CUSTOM";
      description: string;
      amountCents: number;
    }
  | {
      type: "CONVENTIONAL";
      panelCode: string;
      notes: string;
      hours: number;
      amountCents: number;
      hourlyRateCents?: number;
    }
  | {
      type: "REPLACE";
      panelCode: string;
      description: string;
      partsCents: number;
      hours: number;
      amountCents: number;
      hourlyRateCents?: number;
    };

export type VehiclePatch = {
  year: string;
  make: string;
  model: string;
  vin: string;
  bodyClass: string;
};

export type EstimateDraftPayload = {
  id?: string;
  customerId: string;
  vehicleId: string | null;
  claimId: string | null;
  notes: string;
  bodyStyle: BodyStyle;
  carrierId?: string;
  ownerName?: string;
  claimNumber?: string;
  lines: EstimateDraftLine[];
  vehiclePatch?: VehiclePatch | null;
  photos?: { path?: string; name: string; dataUrl?: string }[];
};
