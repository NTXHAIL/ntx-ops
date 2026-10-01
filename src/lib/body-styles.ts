export const BODY_STYLES = [
  { code: "CAR", label: "Car" },
  { code: "TRUCK", label: "Truck" },
  { code: "SUV", label: "SUV" },
  { code: "VAN", label: "Van" },
] as const;

export type BodyStyle = (typeof BODY_STYLES)[number]["code"];

export const BODY_STYLE_LABELS: Record<BodyStyle, string> = {
  CAR: "Car",
  TRUCK: "Truck",
  SUV: "SUV",
  VAN: "Van",
};

export const BODY_PANELS: Record<BodyStyle, string[]> = {
  CAR: [
    "HOOD",
    "COWL",
    "FENDER_LF",
    "FENDER_RF",
    "ROOF",
    "ROOF_RAIL_L",
    "ROOF_RAIL_R",
    "DOOR_LF",
    "DOOR_RF",
    "DOOR_LR",
    "DOOR_RR",
    "QUARTER_L",
    "QUARTER_R",
    "DECK",
  ],
  TRUCK: [
    "HOOD",
    "COWL",
    "FENDER_LF",
    "FENDER_RF",
    "ROOF",
    "ROOF_RAIL_L",
    "ROOF_RAIL_R",
    "DOOR_LF",
    "DOOR_RF",
    "CAB_CORNER_L",
    "CAB_CORNER_R",
    "BED",
  ],
  SUV: [
    "HOOD",
    "COWL",
    "FENDER_LF",
    "FENDER_RF",
    "ROOF",
    "ROOF_RAIL_L",
    "ROOF_RAIL_R",
    "DOOR_LF",
    "DOOR_RF",
    "DOOR_LR",
    "DOOR_RR",
    "QUARTER_L",
    "QUARTER_R",
    "LIFTGATE",
  ],
  VAN: [
    "HOOD",
    "COWL",
    "FENDER_LF",
    "FENDER_RF",
    "ROOF",
    "ROOF_RAIL_L",
    "ROOF_RAIL_R",
    "DOOR_LF",
    "DOOR_RF",
    "DOOR_LR",
    "DOOR_RR",
    "QUARTER_L",
    "QUARTER_R",
    "LIFTGATE",
  ],
};

export type MapHotspot = {
  code: string;
  x: number;
  y: number;
  w: number;
  h: number;
  short: string;
};

const CAR_MAP: MapHotspot[] = [
  { code: "COWL", x: 78, y: 10, w: 84, h: 16, short: "Cowl" },
  { code: "HOOD", x: 78, y: 28, w: 84, h: 46, short: "Hood" },
  { code: "FENDER_LF", x: 18, y: 30, w: 56, h: 42, short: "LF fnd" },
  { code: "FENDER_RF", x: 166, y: 30, w: 56, h: 42, short: "RF fnd" },
  { code: "ROOF_RAIL_L", x: 58, y: 78, w: 18, h: 88, short: "L rail" },
  { code: "ROOF", x: 78, y: 78, w: 84, h: 88, short: "Roof" },
  { code: "ROOF_RAIL_R", x: 164, y: 78, w: 18, h: 88, short: "R rail" },
  { code: "DOOR_LF", x: 18, y: 78, w: 38, h: 50, short: "LF dr" },
  { code: "DOOR_RF", x: 184, y: 78, w: 38, h: 50, short: "RF dr" },
  { code: "DOOR_LR", x: 18, y: 130, w: 38, h: 44, short: "LR dr" },
  { code: "DOOR_RR", x: 184, y: 130, w: 38, h: 44, short: "RR dr" },
  { code: "QUARTER_L", x: 18, y: 180, w: 52, h: 48, short: "L qtr" },
  { code: "DECK", x: 78, y: 172, w: 84, h: 56, short: "Deck" },
  { code: "QUARTER_R", x: 170, y: 180, w: 52, h: 48, short: "R qtr" },
];

const TRUCK_MAP: MapHotspot[] = [
  { code: "COWL", x: 78, y: 10, w: 84, h: 16, short: "Cowl" },
  { code: "HOOD", x: 78, y: 28, w: 84, h: 42, short: "Hood" },
  { code: "FENDER_LF", x: 18, y: 28, w: 56, h: 40, short: "LF fnd" },
  { code: "FENDER_RF", x: 166, y: 28, w: 56, h: 40, short: "RF fnd" },
  { code: "ROOF_RAIL_L", x: 58, y: 74, w: 18, h: 70, short: "L rail" },
  { code: "ROOF", x: 78, y: 74, w: 84, h: 70, short: "Roof" },
  { code: "ROOF_RAIL_R", x: 164, y: 74, w: 18, h: 70, short: "R rail" },
  { code: "DOOR_LF", x: 18, y: 74, w: 38, h: 56, short: "LF dr" },
  { code: "DOOR_RF", x: 184, y: 74, w: 38, h: 56, short: "RF dr" },
  { code: "CAB_CORNER_L", x: 18, y: 134, w: 52, h: 28, short: "L cab" },
  { code: "CAB_CORNER_R", x: 170, y: 134, w: 52, h: 28, short: "R cab" },
  { code: "BED", x: 50, y: 168, w: 140, h: 72, short: "Bed" },
];

const SUV_MAP: MapHotspot[] = [
  { code: "COWL", x: 78, y: 10, w: 84, h: 16, short: "Cowl" },
  { code: "HOOD", x: 78, y: 28, w: 84, h: 40, short: "Hood" },
  { code: "FENDER_LF", x: 18, y: 28, w: 56, h: 40, short: "LF fnd" },
  { code: "FENDER_RF", x: 166, y: 28, w: 56, h: 40, short: "RF fnd" },
  { code: "ROOF_RAIL_L", x: 58, y: 72, w: 18, h: 96, short: "L rail" },
  { code: "ROOF", x: 78, y: 72, w: 84, h: 96, short: "Roof" },
  { code: "ROOF_RAIL_R", x: 164, y: 72, w: 18, h: 96, short: "R rail" },
  { code: "DOOR_LF", x: 18, y: 74, w: 38, h: 48, short: "LF dr" },
  { code: "DOOR_RF", x: 184, y: 74, w: 38, h: 48, short: "RF dr" },
  { code: "DOOR_LR", x: 18, y: 124, w: 38, h: 44, short: "LR dr" },
  { code: "DOOR_RR", x: 184, y: 124, w: 38, h: 44, short: "RR dr" },
  { code: "QUARTER_L", x: 18, y: 176, w: 52, h: 52, short: "L qtr" },
  { code: "LIFTGATE", x: 78, y: 174, w: 84, h: 54, short: "Lift" },
  { code: "QUARTER_R", x: 170, y: 176, w: 52, h: 52, short: "R qtr" },
];

const VAN_MAP: MapHotspot[] = [
  { code: "COWL", x: 78, y: 8, w: 84, h: 16, short: "Cowl" },
  { code: "HOOD", x: 78, y: 26, w: 84, h: 34, short: "Hood" },
  { code: "FENDER_LF", x: 18, y: 26, w: 56, h: 36, short: "LF fnd" },
  { code: "FENDER_RF", x: 166, y: 26, w: 56, h: 36, short: "RF fnd" },
  { code: "ROOF_RAIL_L", x: 58, y: 64, w: 18, h: 118, short: "L rail" },
  { code: "ROOF", x: 78, y: 64, w: 84, h: 118, short: "Roof" },
  { code: "ROOF_RAIL_R", x: 164, y: 64, w: 18, h: 118, short: "R rail" },
  { code: "DOOR_LF", x: 18, y: 68, w: 38, h: 52, short: "LF dr" },
  { code: "DOOR_RF", x: 184, y: 68, w: 38, h: 52, short: "RF dr" },
  { code: "DOOR_LR", x: 18, y: 122, w: 38, h: 56, short: "LR dr" },
  { code: "DOOR_RR", x: 184, y: 122, w: 38, h: 56, short: "RR dr" },
  { code: "QUARTER_L", x: 18, y: 184, w: 52, h: 46, short: "L qtr" },
  { code: "LIFTGATE", x: 78, y: 188, w: 84, h: 42, short: "Lift" },
  { code: "QUARTER_R", x: 170, y: 184, w: 52, h: 46, short: "R qtr" },
];

export const BODY_MAPS: Record<BodyStyle, MapHotspot[]> = {
  CAR: CAR_MAP,
  TRUCK: TRUCK_MAP,
  SUV: SUV_MAP,
  VAN: VAN_MAP,
};

export function isBodyStyle(value: string | null | undefined): value is BodyStyle {
  return value === "CAR" || value === "TRUCK" || value === "SUV" || value === "VAN";
}

export function bodyStyleFromClass(bodyClass: string): BodyStyle | null {
  const value = bodyClass.toLowerCase();
  if (value.includes("pickup") || value.includes("truck")) return "TRUCK";
  if (
    value.includes("suv") ||
    value.includes("sport utility") ||
    value.includes("crossover")
  ) {
    return "SUV";
  }
  if (value.includes("van") || value.includes("minivan")) return "VAN";
  if (
    value.includes("sedan") ||
    value.includes("coupe") ||
    value.includes("hatch") ||
    value.includes("convertible") ||
    value.includes("wagon")
  ) {
    return "CAR";
  }
  return null;
}
