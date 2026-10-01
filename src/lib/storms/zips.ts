import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "@/lib/storms/csv";
import { haversineMiles } from "@/lib/storms/geo";
import type { HailReport, HailSwath, StormDraftZip, ZipCentroid } from "@/lib/storms/types";

export const DEFAULT_REPORT_RADIUS_MILES = 8;

let cached: ZipCentroid[] | null = null;

export function zipDatasetPath() {
  return join(process.cwd(), "data", "zips-tx-ok-ar-mo.csv");
}

export function loadZipCentroids(csv = readFileSync(zipDatasetPath(), "utf8")): ZipCentroid[] {
  if (cached && csv === undefined) return cached;
  const rows = parseCsv(csv);
  const header = rows[0] ?? [];
  const body = header[0] === "zip" ? rows.slice(1) : rows;
  const zips = body
    .map((cells) => ({
      zip: cells[0],
      city: cells[1],
      county: cells[2],
      state: cells[3],
      lat: Number(cells[4]),
      lon: Number(cells[5]),
    }))
    .filter(
      (row) =>
        /^\d{5}$/.test(row.zip) &&
        Number.isFinite(row.lat) &&
        Number.isFinite(row.lon),
    );
  cached = zips;
  return zips;
}

export function zipsFromReportRadius(
  reports: HailReport[],
  centroids: ZipCentroid[],
  radiusMiles = DEFAULT_REPORT_RADIUS_MILES,
): StormDraftZip[] {
  const byZip = new Map<string, StormDraftZip>();
  for (const report of reports) {
    for (const zip of centroids) {
      if (zip.state !== report.state) continue;
      if (haversineMiles(report.lat, report.lon, zip.lat, zip.lon) > radiusMiles) continue;
      const existing = byZip.get(zip.zip);
      if (!existing || report.hailInches > existing.maxHailInches) {
        byZip.set(zip.zip, { ...zip, maxHailInches: report.hailInches });
      }
    }
  }
  return [...byZip.values()].sort((a, b) => b.maxHailInches - a.maxHailInches || a.zip.localeCompare(b.zip));
}

/** Drop-in replacement when NOAA MRMS MESH swath cells are available. */
export function zipsFromSwath(
  swath: HailSwath,
  centroids: ZipCentroid[],
  radiusMiles = DEFAULT_REPORT_RADIUS_MILES,
): StormDraftZip[] {
  const byZip = new Map<string, StormDraftZip>();
  for (const cell of swath.cells) {
    for (const zip of centroids) {
      if (haversineMiles(cell.lat, cell.lon, zip.lat, zip.lon) > radiusMiles) continue;
      const existing = byZip.get(zip.zip);
      if (!existing || cell.hailInches > existing.maxHailInches) {
        byZip.set(zip.zip, { ...zip, maxHailInches: cell.hailInches });
      }
    }
  }
  return [...byZip.values()].sort((a, b) => b.maxHailInches - a.maxHailInches || a.zip.localeCompare(b.zip));
}

export function reportsToSwath(reports: HailReport[]): HailSwath {
  return {
    source: "RADIUS",
    cells: reports.map((report) => ({
      lat: report.lat,
      lon: report.lon,
      hailInches: report.hailInches,
    })),
  };
}
