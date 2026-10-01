import { parseCsv } from "@/lib/storms/csv";
import { SERVICE_STATES, type HailReport } from "@/lib/storms/types";

export function spcHailUrl(date: Date) {
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `https://www.spc.noaa.gov/climo/reports/${yy}${mm}${dd}_rpts_hail.csv`;
}

export function dateFromSpcStamp(stamp: string) {
  const yy = Number(stamp.slice(0, 2));
  const mm = Number(stamp.slice(2, 4));
  const dd = Number(stamp.slice(4, 6));
  const year = yy >= 70 ? 1900 + yy : 2000 + yy;
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** SPC hail size is hundredths of an inch (175 = 1.75"). */
export function parseSpcHailCsv(csv: string, occurredOn: string, source = "SPC LSR"): HailReport[] {
  const rows = parseCsv(csv);
  if (!rows.length) return [];
  const header = rows[0].map((cell) => cell.toLowerCase());
  const isHeader =
    header.includes("time") && (header.includes("size") || header.includes("f_scale"));
  const body = isHeader ? rows.slice(1) : rows;
  const reports: HailReport[] = [];
  for (const cells of body) {
    if (cells.length < 7) continue;
    const [time, sizeRaw, location, county, stateRaw, latRaw, lonRaw, ...rest] = cells;
    const state = (stateRaw || "").toUpperCase();
    if (!SERVICE_STATES.includes(state as (typeof SERVICE_STATES)[number])) continue;
    const hundredths = Number(sizeRaw);
    if (!Number.isFinite(hundredths) || hundredths <= 0) continue;
    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    reports.push({
      time,
      hailInches: hundredths / 100,
      location,
      county,
      state,
      lat,
      lon,
      comments: rest.join(", "),
      source,
      occurredOn,
    });
  }
  return reports;
}
