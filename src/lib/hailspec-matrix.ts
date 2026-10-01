import type { HsKey } from "@/lib/hailspec";

/** Verbatim State Farm HailSpec matrix (dollars). 0 = conventional / R&R recommended. */
export const STATE_FARM_MATRIX_DOLLARS: Record<
  HsKey,
  { range: string; min: number; max: number; DIME: number; NICKEL: number; QUARTER: number; HALF: number }[]
> = {
  HOOD: [
    { range: "1 - 5", min: 1, max: 5, DIME: 80, NICKEL: 100, QUARTER: 125, HALF: 150 },
    { range: "6 - 15", min: 6, max: 15, DIME: 125, NICKEL: 175, QUARTER: 200, HALF: 250 },
    { range: "16 - 30", min: 16, max: 30, DIME: 200, NICKEL: 225, QUARTER: 275, HALF: 350 },
    { range: "31 - 50", min: 31, max: 50, DIME: 300, NICKEL: 350, QUARTER: 425, HALF: 500 },
    { range: "51 - 75", min: 51, max: 75, DIME: 375, NICKEL: 400, QUARTER: 500, HALF: 625 },
    { range: "76 - 100", min: 76, max: 100, DIME: 450, NICKEL: 550, QUARTER: 650, HALF: 750 },
    { range: "101 - 150", min: 101, max: 150, DIME: 550, NICKEL: 650, QUARTER: 0, HALF: 0 },
    { range: "151 - 200", min: 151, max: 200, DIME: 650, NICKEL: 800, QUARTER: 0, HALF: 0 },
    { range: "201 - 300", min: 201, max: 300, DIME: 725, NICKEL: 825, QUARTER: 0, HALF: 0 },
  ],
  ROOF: [
    { range: "1 - 5", min: 1, max: 5, DIME: 100, NICKEL: 125, QUARTER: 150, HALF: 200 },
    { range: "6 - 15", min: 6, max: 15, DIME: 175, NICKEL: 225, QUARTER: 250, HALF: 325 },
    { range: "16 - 30", min: 16, max: 30, DIME: 250, NICKEL: 300, QUARTER: 350, HALF: 425 },
    { range: "31 - 50", min: 31, max: 50, DIME: 375, NICKEL: 425, QUARTER: 525, HALF: 600 },
    { range: "51 - 75", min: 51, max: 75, DIME: 475, NICKEL: 550, QUARTER: 675, HALF: 800 },
    { range: "76 - 100", min: 76, max: 100, DIME: 575, NICKEL: 675, QUARTER: 800, HALF: 900 },
    { range: "101 - 150", min: 101, max: 150, DIME: 650, NICKEL: 750, QUARTER: 950, HALF: 1100 },
    { range: "151 - 200", min: 151, max: 200, DIME: 850, NICKEL: 950, QUARTER: 1150, HALF: 1450 },
    { range: "201 - 300", min: 201, max: 300, DIME: 950, NICKEL: 1150, QUARTER: 1350, HALF: 1550 },
  ],
  TRUNK: [
    { range: "1 - 5", min: 1, max: 5, DIME: 80, NICKEL: 100, QUARTER: 125, HALF: 150 },
    { range: "6 - 15", min: 6, max: 15, DIME: 125, NICKEL: 150, QUARTER: 200, HALF: 250 },
    { range: "16 - 30", min: 16, max: 30, DIME: 175, NICKEL: 225, QUARTER: 275, HALF: 300 },
    { range: "31 - 50", min: 31, max: 50, DIME: 275, NICKEL: 325, QUARTER: 400, HALF: 475 },
    { range: "51 - 75", min: 51, max: 75, DIME: 400, NICKEL: 450, QUARTER: 500, HALF: 600 },
    { range: "76 - 100", min: 76, max: 100, DIME: 450, NICKEL: 550, QUARTER: 650, HALF: 0 },
    { range: "101 - 150", min: 101, max: 150, DIME: 550, NICKEL: 650, QUARTER: 0, HALF: 0 },
    { range: "151 - 200", min: 151, max: 200, DIME: 650, NICKEL: 0, QUARTER: 0, HALF: 0 },
    { range: "201 - 300", min: 201, max: 300, DIME: 750, NICKEL: 0, QUARTER: 0, HALF: 0 },
  ],
  LFF: [
    { range: "1 - 5", min: 1, max: 5, DIME: 80, NICKEL: 100, QUARTER: 125, HALF: 150 },
    { range: "6 - 15", min: 6, max: 15, DIME: 125, NICKEL: 150, QUARTER: 175, HALF: 200 },
    { range: "16 - 30", min: 16, max: 30, DIME: 175, NICKEL: 225, QUARTER: 275, HALF: 300 },
    { range: "31 - 50", min: 31, max: 50, DIME: 275, NICKEL: 300, QUARTER: 350, HALF: 375 },
  ],
  LFD: [
    { range: "1 - 5", min: 1, max: 5, DIME: 80, NICKEL: 100, QUARTER: 125, HALF: 150 },
    { range: "6 - 15", min: 6, max: 15, DIME: 125, NICKEL: 150, QUARTER: 175, HALF: 200 },
    { range: "16 - 30", min: 16, max: 30, DIME: 175, NICKEL: 225, QUARTER: 250, HALF: 300 },
    { range: "31 - 50", min: 31, max: 50, DIME: 275, NICKEL: 300, QUARTER: 350, HALF: 0 },
  ],
  LRD: [
    { range: "1 - 5", min: 1, max: 5, DIME: 80, NICKEL: 100, QUARTER: 125, HALF: 150 },
    { range: "6 - 15", min: 6, max: 15, DIME: 125, NICKEL: 150, QUARTER: 175, HALF: 200 },
    { range: "16 - 30", min: 16, max: 30, DIME: 175, NICKEL: 225, QUARTER: 250, HALF: 300 },
    { range: "31 - 50", min: 31, max: 50, DIME: 275, NICKEL: 300, QUARTER: 350, HALF: 0 },
  ],
  LQ: [
    { range: "1 - 5", min: 1, max: 5, DIME: 80, NICKEL: 100, QUARTER: 125, HALF: 150 },
    { range: "6 - 15", min: 6, max: 15, DIME: 125, NICKEL: 150, QUARTER: 175, HALF: 200 },
    { range: "16 - 30", min: 16, max: 30, DIME: 175, NICKEL: 225, QUARTER: 250, HALF: 300 },
    { range: "31 - 50", min: 31, max: 50, DIME: 275, NICKEL: 325, QUARTER: 400, HALF: 475 },
  ],
  LRAIL: [
    { range: "1 - 5", min: 1, max: 5, DIME: 85, NICKEL: 100, QUARTER: 125, HALF: 150 },
    { range: "6 - 15", min: 6, max: 15, DIME: 125, NICKEL: 150, QUARTER: 175, HALF: 0 },
    { range: "16 - 30", min: 16, max: 30, DIME: 200, NICKEL: 250, QUARTER: 275, HALF: 0 },
    { range: "31 - 50", min: 31, max: 50, DIME: 300, NICKEL: 400, QUARTER: 0, HALF: 0 },
  ],
  RFF: [
    { range: "1 - 5", min: 1, max: 5, DIME: 80, NICKEL: 100, QUARTER: 125, HALF: 150 },
    { range: "6 - 15", min: 6, max: 15, DIME: 125, NICKEL: 150, QUARTER: 175, HALF: 200 },
    { range: "16 - 30", min: 16, max: 30, DIME: 175, NICKEL: 225, QUARTER: 275, HALF: 300 },
    { range: "31 - 50", min: 31, max: 50, DIME: 275, NICKEL: 300, QUARTER: 350, HALF: 375 },
  ],
  RFD: [
    { range: "1 - 5", min: 1, max: 5, DIME: 80, NICKEL: 100, QUARTER: 125, HALF: 150 },
    { range: "6 - 15", min: 6, max: 15, DIME: 125, NICKEL: 150, QUARTER: 175, HALF: 200 },
    { range: "16 - 30", min: 16, max: 30, DIME: 175, NICKEL: 225, QUARTER: 250, HALF: 300 },
    { range: "31 - 50", min: 31, max: 50, DIME: 275, NICKEL: 300, QUARTER: 350, HALF: 0 },
  ],
  RRD: [
    { range: "1 - 5", min: 1, max: 5, DIME: 80, NICKEL: 100, QUARTER: 125, HALF: 150 },
    { range: "6 - 15", min: 6, max: 15, DIME: 125, NICKEL: 150, QUARTER: 175, HALF: 200 },
    { range: "16 - 30", min: 16, max: 30, DIME: 175, NICKEL: 225, QUARTER: 250, HALF: 300 },
    { range: "31 - 50", min: 31, max: 50, DIME: 275, NICKEL: 300, QUARTER: 350, HALF: 0 },
  ],
  RQ: [
    { range: "1 - 5", min: 1, max: 5, DIME: 80, NICKEL: 100, QUARTER: 125, HALF: 150 },
    { range: "6 - 15", min: 6, max: 15, DIME: 125, NICKEL: 150, QUARTER: 175, HALF: 200 },
    { range: "16 - 30", min: 16, max: 30, DIME: 175, NICKEL: 225, QUARTER: 250, HALF: 300 },
    { range: "31 - 50", min: 31, max: 50, DIME: 275, NICKEL: 325, QUARTER: 400, HALF: 475 },
  ],
  RRAIL: [
    { range: "1 - 5", min: 1, max: 5, DIME: 85, NICKEL: 100, QUARTER: 125, HALF: 150 },
    { range: "6 - 15", min: 6, max: 15, DIME: 125, NICKEL: 150, QUARTER: 175, HALF: 0 },
    { range: "16 - 30", min: 16, max: 30, DIME: 200, NICKEL: 250, QUARTER: 275, HALF: 0 },
    { range: "31 - 50", min: 31, max: 50, DIME: 300, NICKEL: 400, QUARTER: 0, HALF: 0 },
  ],
};

export const HS_PANEL_LABELS: Record<HsKey, string> = {
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

export function buildStateFarmMatrixRows() {
  return (Object.keys(STATE_FARM_MATRIX_DOLLARS) as HsKey[]).flatMap((panel) =>
    STATE_FARM_MATRIX_DOLLARS[panel].map((row) => ({
      panelCode: panel,
      panelLabel: HS_PANEL_LABELS[panel],
      minDents: row.min,
      maxDents: row.max,
      dimeCents: row.DIME * 100,
      nickelCents: row.NICKEL * 100,
      quarterCents: row.QUARTER * 100,
      halfDollarCents: row.HALF * 100,
    })),
  );
}

export const CARRIER_IDS = [
  "state_farm",
  "allstate",
  "farmers",
  "geico",
  "progressive",
  "nationwide",
  "custom",
] as const;

export type CarrierId = (typeof CARRIER_IDS)[number];

export const CARRIER_SEED = [
  { id: "state_farm", name: "State Farm", isStub: false },
  { id: "allstate", name: "Allstate", isStub: true },
  { id: "farmers", name: "Farmers", isStub: true },
  { id: "geico", name: "GEICO", isStub: true },
  { id: "progressive", name: "Progressive", isStub: true },
  { id: "nationwide", name: "Nationwide", isStub: true },
  { id: "custom", name: "Custom", isStub: true },
] as const;
