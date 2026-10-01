import { SERVICE_STATES, type HailReport } from "@/lib/storms/types";

type NwsAlert = {
  properties?: {
    event?: string;
    headline?: string;
    areaDesc?: string;
    effective?: string;
    onset?: string;
    sent?: string;
    parameters?: Record<string, string[] | undefined>;
  };
  geometry?: { type?: string; coordinates?: unknown };
};

function pointFromGeometry(geometry: NwsAlert["geometry"]): { lat: number; lon: number } | null {
  if (!geometry?.coordinates) return null;
  const coords = geometry.coordinates;
  if (geometry.type === "Point" && Array.isArray(coords) && coords.length >= 2) {
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  }
  return null;
}

function hailInchesFromAlert(alert: NwsAlert) {
  const params = alert.properties?.parameters || {};
  const raw = params.maxHailSize?.[0] || params.hailSize?.[0] || "";
  const match = String(raw).match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 1;
}

function stateFromArea(area: string) {
  const match = area.match(/\b(TX|OK|AR|MO)\b/);
  return match?.[1] ?? "";
}

export function parseNwsHailAlerts(payload: { features?: NwsAlert[] }, occurredOn: string): HailReport[] {
  const reports: HailReport[] = [];
  for (const feature of payload.features ?? []) {
    const event = feature.properties?.event || "";
    if (!/hail/i.test(event)) continue;
    const point = pointFromGeometry(feature.geometry);
    if (!point) continue;
    const area = feature.properties?.areaDesc || "";
    const state = stateFromArea(area);
    if (!SERVICE_STATES.includes(state as (typeof SERVICE_STATES)[number])) continue;
    const when = (feature.properties?.onset || feature.properties?.effective || occurredOn).slice(0, 10);
    reports.push({
      time: (feature.properties?.sent || "").slice(11, 16).replace(":", "") || "0000",
      hailInches: hailInchesFromAlert(feature),
      location: area.split(";")[0]?.split(",")[0]?.trim() || "NWS alert",
      county: area,
      state,
      lat: point.lat,
      lon: point.lon,
      comments: feature.properties?.headline || event,
      source: "NWS alert",
      occurredOn: when,
    });
  }
  return reports;
}

export async function fetchNwsHailAlerts(occurredOn: string): Promise<HailReport[]> {
  const reports: HailReport[] = [];
  for (const state of SERVICE_STATES) {
    const url = `https://api.weather.gov/alerts?event=Hail&status=actual&limit=50&area=${state}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/geo+json",
        "User-Agent": "NTX Hail Ops storm ingest (team@ntxhail.com)",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`NWS alerts ${response.status} ${state}`);
    }
    reports.push(
      ...parseNwsHailAlerts((await response.json()) as { features?: NwsAlert[] }, occurredOn),
    );
  }
  return reports;
}
