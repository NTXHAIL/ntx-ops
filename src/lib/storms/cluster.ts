import { haversineMiles, slugify } from "@/lib/storms/geo";
import type { HailReport, StormDraft } from "@/lib/storms/types";

export const DEFAULT_CLUSTER_MILES = 55;
export const DEFAULT_MIN_HAIL_INCHES = 1;

function topPlaces(reports: HailReport[], count = 2) {
  const scores = new Map<string, number>();
  for (const report of reports) {
    const place = report.location.replace(/^\d+(\.\d+)?\s+[A-Z]{1,3}\s+/, "").trim();
    const key = place || report.county;
    scores.set(key, (scores.get(key) || 0) + 1);
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .filter(Boolean)
    .slice(0, count);
}

export function clusterReports(
  reports: HailReport[],
  opts: { radiusMiles?: number; minHailInches?: number } = {},
): HailReport[][] {
  const radius = opts.radiusMiles ?? DEFAULT_CLUSTER_MILES;
  const minHail = opts.minHailInches ?? DEFAULT_MIN_HAIL_INCHES;
  const usable = reports.filter((report) => report.hailInches >= minHail);
  const parent = usable.map((_, index) => index);
  const find = (index: number): number => {
    if (parent[index] !== index) parent[index] = find(parent[index]);
    return parent[index];
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      if (usable[i].occurredOn !== usable[j].occurredOn) continue;
      if (haversineMiles(usable[i].lat, usable[i].lon, usable[j].lat, usable[j].lon) <= radius) {
        union(i, j);
      }
    }
  }
  const groups = new Map<number, HailReport[]>();
  usable.forEach((report, index) => {
    const root = find(index);
    const list = groups.get(root) ?? [];
    list.push(report);
    groups.set(root, list);
  });
  return [...groups.values()].sort((a, b) => b.length - a.length);
}

export function draftFromCluster(reports: HailReport[]): StormDraft {
  const places = topPlaces(reports);
  const states = [...new Set(reports.map((report) => report.state))].sort();
  const occurredOn = reports[0]?.occurredOn ?? "";
  const peakHailInches = Math.max(...reports.map((report) => report.hailInches));
  const name = places.length
    ? `${places.join(" / ")} hail`
    : `${states.join("/")} hail`;
  const slug = slugify(`${occurredOn}-${places.join("-") || states.join("-")}`);
  const sources = [...new Set(reports.map((report) => report.source))];
  return {
    name,
    slug,
    occurredOn,
    states,
    peakHailInches,
    source: sources.join(" + "),
    zips: [],
    reports,
  };
}
