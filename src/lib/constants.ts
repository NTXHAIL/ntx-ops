export const PRODUCT_NAME = "Hail Ops";
export const BRAND_NAME = "NTX Hail";
export const LEGAL_NAME = "Dakine Investments LLC DBA NTX Hail";
export const BRAND_PHONE = "214-308-5779";
export const BRAND_EMAIL = "team@ntxhail.com";

export const PANELS = [
  { code: "HOOD", label: "Hood" },
  { code: "ROOF", label: "Roof" },
  { code: "DECK", label: "Deck lid / trunk" },
  { code: "BED", label: "Bed" },
  { code: "LIFTGATE", label: "Liftgate" },
  { code: "ROOF_RAIL_L", label: "Roof rail (L)" },
  { code: "ROOF_RAIL_R", label: "Roof rail (R)" },
  { code: "FENDER_LF", label: "Fender (LF)" },
  { code: "FENDER_RF", label: "Fender (RF)" },
  { code: "DOOR_LF", label: "Door (LF)" },
  { code: "DOOR_RF", label: "Door (RF)" },
  { code: "DOOR_LR", label: "Door (LR)" },
  { code: "DOOR_RR", label: "Door (RR)" },
  { code: "QUARTER_L", label: "Quarter (L)" },
  { code: "QUARTER_R", label: "Quarter (R)" },
  { code: "CAB_CORNER_L", label: "Cab corner (L)" },
  { code: "CAB_CORNER_R", label: "Cab corner (R)" },
  { code: "COWL", label: "Cowl / other" },
] as const;

export type PanelCode = (typeof PANELS)[number]["code"];

export const DENT_BANDS: { minDents: number; maxDents: number | null }[] = [
  { minDents: 1, maxDents: 5 },
  { minDents: 6, maxDents: 15 },
  { minDents: 16, maxDents: 30 },
  { minDents: 31, maxDents: 50 },
  { minDents: 51, maxDents: 75 },
  { minDents: 76, maxDents: 100 },
  { minDents: 101, maxDents: 150 },
  { minDents: 151, maxDents: 200 },
];

export const DENT_SIZES = ["DIME", "NICKEL", "QUARTER", "HALF_DOLLAR"] as const;
export type DentSize = (typeof DENT_SIZES)[number];

export const DENT_SIZE_LABELS: Record<DentSize, string> = {
  DIME: "Dime",
  NICKEL: "Nickel",
  QUARTER: "Quarter",
  HALF_DOLLAR: "Half Dollar",
};

export const ESTIMATE_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "DECLINED",
] as const;

export const ESTIMATE_STATUS_LABELS: Record<
  (typeof ESTIMATE_STATUSES)[number],
  string
> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  DECLINED: "Declined",
};

export const CLAIM_STATUSES = ["OPEN", "PENDING", "IN_REVIEW", "CLOSED"] as const;

export const CLAIM_STATUS_LABELS: Record<(typeof CLAIM_STATUSES)[number], string> =
  {
    OPEN: "Open",
    PENDING: "Pending",
    IN_REVIEW: "In review",
    CLOSED: "Closed",
  };

export const STORM_STATUSES = ["DETECTED", "APPROVED", "ACTIVE", "CLOSED"] as const;

export const STORM_STATUS_LABELS: Record<(typeof STORM_STATUSES)[number], string> = {
  DETECTED: "Detected",
  APPROVED: "Approved",
  ACTIVE: "Active",
  CLOSED: "Closed",
};

export const LEAD_STATUSES = ["NEW", "CONTACTED", "BOOKED", "ESTIMATED", "WON", "LOST"] as const;

export const LEAD_STATUS_LABELS: Record<(typeof LEAD_STATUSES)[number], string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  BOOKED: "Booked",
  ESTIMATED: "Estimated",
  WON: "Won",
  LOST: "Lost",
};

const HS_PANEL_LABELS: Record<string, string> = {
  TRUNK: "Trunk / Liftgate / Tailgate",
  LFF: "Left Front Fender",
  LFD: "Left Front Door",
  LRD: "Left Rear Door",
  LQ: "Left Quarter",
  LRAIL: "Left Rail",
  RFF: "Right Front Fender",
  RFD: "Right Front Door",
  RRD: "Right Rear Door",
  RQ: "Right Quarter",
  RRAIL: "Right Rail",
};

export function panelLabel(code: string) {
  return PANELS.find((p) => p.code === code)?.label ?? HS_PANEL_LABELS[code] ?? code;
}

export function dentBandLabel(minDents: number, maxDents: number | null) {
  return maxDents == null ? `${minDents}+` : `${minDents} - ${maxDents}`;
}

/** Original NTX Hail starter factors — not a carrier or competitor matrix. */
export const STARTER_PANEL_FACTOR: Record<string, number> = {
  HOOD: 1.0,
  ROOF: 1.28,
  DECK: 0.92,
  BED: 0.94,
  LIFTGATE: 0.95,
  ROOF_RAIL_L: 0.82,
  ROOF_RAIL_R: 0.82,
  FENDER_LF: 0.86,
  FENDER_RF: 0.86,
  DOOR_LF: 0.86,
  DOOR_RF: 0.86,
  DOOR_LR: 0.86,
  DOOR_RR: 0.86,
  QUARTER_L: 0.88,
  QUARTER_R: 0.88,
  CAB_CORNER_L: 0.8,
  CAB_CORNER_R: 0.8,
  COWL: 0.9,
};

/** Hood dime price (cents) per dent-count band for the starter matrix. */
export const STARTER_BAND_DIME_CENTS = [
  9500, 15500, 22500, 31000, 41000, 53000, 68000, 86000,
] as const;

export const STARTER_SIZE_FACTOR = {
  dime: 1,
  nickel: 1.28,
  quarter: 1.58,
  half: 1.92,
} as const;

export function roundToDollarCents(value: number) {
  return Math.round(value / 100) * 100;
}

export function buildStarterMatrixRows() {
  return PANELS.flatMap((panel) =>
    DENT_BANDS.map((band, index) => {
      const base = STARTER_BAND_DIME_CENTS[index] * (STARTER_PANEL_FACTOR[panel.code] ?? 1);
      return {
        panelCode: panel.code,
        panelLabel: panel.label,
        minDents: band.minDents,
        maxDents: band.maxDents,
        dimeCents: roundToDollarCents(base * STARTER_SIZE_FACTOR.dime),
        nickelCents: roundToDollarCents(base * STARTER_SIZE_FACTOR.nickel),
        quarterCents: roundToDollarCents(base * STARTER_SIZE_FACTOR.quarter),
        halfDollarCents: roundToDollarCents(base * STARTER_SIZE_FACTOR.half),
      };
    }),
  );
}
