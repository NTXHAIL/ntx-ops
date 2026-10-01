import { dentBandLabel, type DentSize } from "@/lib/constants";
import type { BodyStyle } from "@/lib/body-styles";

export const HS_CARRIERS = [
  { id: "state_farm", label: "State Farm", color: "#dc2626", badge: "SF" },
  { id: "allstate", label: "Allstate", color: "#0066cc", badge: "AL" },
  { id: "farmers", label: "Farmers", color: "#e07b00", badge: "FM" },
  { id: "geico", label: "GEICO", color: "#00a651", badge: "GE" },
  { id: "progressive", label: "Progressive", color: "#0066ff", badge: "PR" },
  { id: "nationwide", label: "Nationwide", color: "#1a1a6e", badge: "NW" },
  { id: "custom", label: "Custom", color: "#64748b", badge: "CX" },
] as const;

export const DEFAULT_LABOR_RATE_CENTS = 6000;
export const OS_DENT_CENTS = 5000;
export const DOUBLE_OS_CENTS = 10000;

export type HsKey =
  | "HOOD"
  | "LFF"
  | "RFF"
  | "LFD"
  | "RFD"
  | "LRAIL"
  | "RRAIL"
  | "ROOF"
  | "LRD"
  | "RRD"
  | "LQ"
  | "RQ"
  | "TRUNK";

export const HS_PANEL_PATHS: Record<HsKey, { d: string; cx: number; cy: number }> = {
  HOOD: {
    d: "M155,45 C155,30 185,15 210,12 C235,15 265,30 265,45 L265,115 C265,120 260,125 255,125 L165,125 C160,125 155,120 155,115 Z",
    cx: 210,
    cy: 70,
  },
  LFF: { d: "M100,35 L150,20 L150,125 L100,110 Z", cx: 120, cy: 72 },
  RFF: { d: "M270,20 L320,35 L320,110 L270,125 Z", cx: 300, cy: 72 },
  LFD: { d: "M95,118 L148,128 L148,250 L95,240 Z", cx: 118, cy: 184 },
  RFD: { d: "M272,128 L325,118 L325,240 L272,250 Z", cx: 302, cy: 184 },
  LRAIL: { d: "M148,140 L175,140 L175,310 L148,310 Z", cx: 162, cy: 225 },
  RRAIL: { d: "M245,140 L272,140 L272,310 L245,310 Z", cx: 258, cy: 225 },
  ROOF: {
    d: "M175,130 L245,130 L250,145 L250,300 L245,315 L175,315 L170,300 L170,145 Z",
    cx: 210,
    cy: 222,
  },
  LRD: { d: "M95,248 L148,258 L148,370 L95,355 Z", cx: 118, cy: 310 },
  RRD: { d: "M272,258 L325,248 L325,355 L272,370 Z", cx: 302, cy: 310 },
  LQ: { d: "M100,362 L150,375 L150,430 L120,440 L100,430 Z", cx: 122, cy: 400 },
  RQ: { d: "M270,375 L320,362 L320,430 L300,440 L270,430 Z", cx: 298, cy: 400 },
  TRUNK: {
    d: "M155,400 L265,400 L265,445 C265,460 255,470 240,475 L180,475 C165,470 155,460 155,445 Z",
    cx: 210,
    cy: 438,
  },
};

export const HS_KEYS = Object.keys(HS_PANEL_PATHS) as HsKey[];

export const HS_TO_CODE: Record<HsKey, string> = {
  HOOD: "HOOD",
  ROOF: "ROOF",
  TRUNK: "DECK",
  LFF: "FENDER_LF",
  RFF: "FENDER_RF",
  LFD: "DOOR_LF",
  RFD: "DOOR_RF",
  LRD: "DOOR_LR",
  RRD: "DOOR_RR",
  LQ: "QUARTER_L",
  RQ: "QUARTER_R",
  LRAIL: "ROOF_RAIL_L",
  RRAIL: "ROOF_RAIL_R",
};

export const CODE_TO_HS: Record<string, HsKey> = {
  HOOD: "HOOD",
  ROOF: "ROOF",
  TRUNK: "TRUNK",
  LFF: "LFF",
  RFF: "RFF",
  LFD: "LFD",
  RFD: "RFD",
  LRD: "LRD",
  RRD: "RRD",
  LQ: "LQ",
  RQ: "RQ",
  LRAIL: "LRAIL",
  RRAIL: "RRAIL",
  DECK: "TRUNK",
  BED: "TRUNK",
  LIFTGATE: "TRUNK",
  FENDER_LF: "LFF",
  FENDER_RF: "RFF",
  DOOR_LF: "LFD",
  DOOR_RF: "RFD",
  DOOR_LR: "LRD",
  DOOR_RR: "RRD",
  QUARTER_L: "LQ",
  QUARTER_R: "RQ",
  ROOF_RAIL_L: "LRAIL",
  ROOF_RAIL_R: "RRAIL",
};

export const HS_LABELS: Record<HsKey, string> = {
  HOOD: "Hood",
  ROOF: "Roof",
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

export function trunkLabel(style: BodyStyle) {
  if (style === "TRUCK") return "Bed / Tailgate";
  if (style === "SUV" || style === "VAN") return "Liftgate";
  return "Trunk / Deck lid";
}

export function trunkCode(style: BodyStyle) {
  if (style === "TRUCK") return "BED";
  if (style === "SUV" || style === "VAN") return "LIFTGATE";
  return "DECK";
}

export function hsToShopCode(key: HsKey, _style?: BodyStyle) {
  return key;
}

export type RiOp = {
  id: string;
  name: string;
  time: number;
  rrOption?: boolean;
};

export const RI_OPERATIONS: Record<HsKey, RiOp[]> = {
  HOOD: [
    { id: "front_bumper", name: "Front Bumper", time: 1.0 },
    { id: "hood", name: "Hood", time: 1.2 },
    { id: "insulator", name: "Insulator", time: 0.3 },
    { id: "trim", name: "Trim", time: 0.3 },
  ],
  LFF: [
    { id: "liner", name: "Liner", time: 0.2 },
    { id: "headlamp", name: "Headlamp", time: 0.3 },
    { id: "trim", name: "Trim", time: 0.3 },
  ],
  RFF: [
    { id: "liner", name: "Liner", time: 0.2 },
    { id: "headlamp", name: "Headlamp", time: 0.3 },
    { id: "trim", name: "Trim", time: 0.3 },
  ],
  ROOF: [
    { id: "headliner", name: "Headliner", time: 3.0 },
    { id: "sunroof_frame", name: "Sunroof Frame", time: 1.5 },
    { id: "rack", name: "Rack", time: 1.0 },
    { id: "left_molding", name: "Left Molding", time: 0.3, rrOption: true },
    { id: "right_molding", name: "Right Molding", time: 0.3, rrOption: true },
    { id: "antenna", name: "Antenna", time: 0.3 },
    { id: "backglass", name: "Backglass", time: 1.0 },
    { id: "trim", name: "Trim", time: 0.3 },
  ],
  LFD: [
    { id: "mirror", name: "Mirror", time: 0.3, rrOption: true },
    { id: "belt", name: "Belt", time: 0.3, rrOption: true },
    { id: "upper", name: "Upper", time: 0.3, rrOption: true },
    { id: "trim", name: "Trim", time: 0.4 },
    { id: "glass", name: "Glass", time: 0.4 },
    { id: "handle", name: "Handle", time: 0.2 },
    { id: "door", name: "Door", time: 1.2 },
  ],
  RFD: [
    { id: "mirror", name: "Mirror", time: 0.3, rrOption: true },
    { id: "belt", name: "Belt", time: 0.3, rrOption: true },
    { id: "upper", name: "Upper", time: 0.3, rrOption: true },
    { id: "trim", name: "Trim", time: 0.4 },
    { id: "glass", name: "Glass", time: 0.4 },
    { id: "handle", name: "Handle", time: 0.2 },
    { id: "door", name: "Door", time: 1.2 },
  ],
  LRD: [
    { id: "mirror", name: "Mirror", time: 0.3, rrOption: true },
    { id: "belt", name: "Belt", time: 0.3, rrOption: true },
    { id: "upper", name: "Upper", time: 0.3, rrOption: true },
    { id: "trim", name: "Trim", time: 0.4 },
    { id: "glass", name: "Glass", time: 0.4 },
    { id: "handle", name: "Handle", time: 0.2 },
    { id: "door", name: "Door", time: 1.2 },
  ],
  RRD: [
    { id: "mirror", name: "Mirror", time: 0.3, rrOption: true },
    { id: "belt", name: "Belt", time: 0.3, rrOption: true },
    { id: "upper", name: "Upper", time: 0.3, rrOption: true },
    { id: "trim", name: "Trim", time: 0.4 },
    { id: "glass", name: "Glass", time: 0.4 },
    { id: "handle", name: "Handle", time: 0.2 },
    { id: "door", name: "Door", time: 1.2 },
  ],
  LQ: [
    { id: "trim", name: "Trim", time: 0.3 },
    { id: "taillamp", name: "Taillamp", time: 0.3 },
    { id: "qtr_glass", name: "Qtr Glass", time: 0.5, rrOption: true },
  ],
  RQ: [
    { id: "trim", name: "Trim", time: 0.3 },
    { id: "taillamp", name: "Taillamp", time: 0.3 },
    { id: "qtr_glass", name: "Qtr Glass", time: 0.5, rrOption: true },
  ],
  TRUNK: [
    { id: "trunk", name: "Trunk / Liftgate / Tailgate", time: 1.0 },
    { id: "trim", name: "Trim", time: 0.3 },
  ],
  LRAIL: [],
  RRAIL: [],
};

export const PERCENT_ADDONS = [
  { code: "ALUMINUM", name: "Aluminum" },
  { code: "HSS", name: "HSS" },
  { code: "DOUBLE_PANEL", name: "Double Panel" },
  { code: "LIMITED_ACCESS", name: "Limited Access" },
  { code: "TALL_VEHICLE", name: "Tall Vehicle" },
  { code: "LARGE_ROOF", name: "XL Panel" },
] as const;

export type MatrixRow = {
  panelCode: string;
  minDents: number;
  maxDents: number | null;
  dimeCents: number;
  nickelCents: number;
  quarterCents: number;
  halfDollarCents: number;
};

export function rangesForPanel(rows: MatrixRow[], shopCode: string) {
  return rows
    .filter((row) => row.panelCode === shopCode)
    .map((row) => ({
      range: dentBandLabel(row.minDents, row.maxDents),
      min: row.minDents,
      max: row.maxDents ?? row.minDents,
      DIME: row.dimeCents,
      NICKEL: row.nickelCents,
      QUARTER: row.quarterCents,
      HALF_DOLLAR: row.halfDollarCents,
    }));
}

export function sizePrice(row: ReturnType<typeof rangesForPanel>[number] | undefined, size: DentSize) {
  if (!row) return 0;
  return row[size] || 0;
}

export function dentCountForRange(
  selectedRange: string | null,
  ranges: ReturnType<typeof rangesForPanel>,
) {
  if (!selectedRange) return 0;
  return ranges.find((row) => row.range === selectedRange)?.max ?? 0;
}

export function panelHeatColor(opts: {
  count: number;
  max: number;
  rr?: boolean;
  conv?: boolean;
}) {
  if (opts.rr) return "rgba(220,38,38,0.5)";
  if (opts.conv) return "rgba(249,115,22,0.5)";
  if (!opts.count) return "rgba(241,245,249,0.9)";
  const heat = Math.min(opts.count / (opts.max || 50), 1);
  if (heat < 0.25) return "rgba(37,99,235,0.25)";
  if (heat < 0.5) return "rgba(59,130,246,0.4)";
  if (heat < 0.75) return "rgba(249,115,22,0.5)";
  return "rgba(220,38,38,0.6)";
}
