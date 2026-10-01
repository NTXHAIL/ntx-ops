export const SERVICE_STATES = ["TX", "OK", "AR", "MO"] as const;
export type ServiceState = (typeof SERVICE_STATES)[number];

export type HailReport = {
  time: string;
  hailInches: number;
  location: string;
  county: string;
  state: string;
  lat: number;
  lon: number;
  comments: string;
  source: string;
  occurredOn: string;
};

export type ZipCentroid = {
  zip: string;
  city: string;
  county: string;
  state: string;
  lat: number;
  lon: number;
};

export type StormDraftZip = ZipCentroid & {
  maxHailInches: number;
};

export type StormDraft = {
  name: string;
  slug: string;
  occurredOn: string;
  states: string[];
  peakHailInches: number;
  source: string;
  zips: StormDraftZip[];
  reports: HailReport[];
};

export type SwathCell = {
  lat: number;
  lon: number;
  hailInches: number;
};

/** Future NOAA MRMS MESH swath. Radius matching is the v1 default. */
export type HailSwath = {
  source: "MRMS_MESH" | "RADIUS";
  cells: SwathCell[];
};
