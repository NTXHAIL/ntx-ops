import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { DEFAULT_STORM_OFFER } from "@/lib/storms/consent";
import { clusterReports, draftFromCluster } from "@/lib/storms/cluster";
import { fetchMrmsMeshSwath } from "@/lib/storms/mrms";
import { fetchNwsHailAlerts } from "@/lib/storms/nws";
import { dateFromSpcStamp, parseSpcHailCsv, spcHailUrl } from "@/lib/storms/spc";
import type { HailReport, HailSwath, StormDraft } from "@/lib/storms/types";
import { loadZipCentroids, zipsFromReportRadius, zipsFromSwath } from "@/lib/storms/zips";

export type IngestOptions = {
  days?: number;
  end?: Date;
  samplePath?: string;
  includeNws?: boolean;
  persist?: boolean;
};

export function buildStormDrafts(reports: HailReport[], swath?: HailSwath | null): StormDraft[] {
  const centroids = loadZipCentroids();
  return clusterReports(reports)
    .map((group) => {
      const draft = draftFromCluster(group);
      draft.zips = swath
        ? zipsFromSwath(swath, centroids)
        : zipsFromReportRadius(group, centroids);
      return draft;
    })
    .filter((draft) => draft.zips.length > 0);
}

export async function fetchSpcDay(date: Date): Promise<{ url: string; csv: string; reports: HailReport[] }> {
  const url = spcHailUrl(date);
  const stamp = url.match(/(\d{6})_rpts_hail/)?.[1] ?? "";
  const occurredOn = dateFromSpcStamp(stamp);
  const response = await fetch(url, {
    headers: { Accept: "text/csv", "User-Agent": "NTX Hail Ops storm ingest (team@ntxhail.com)" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`SPC ${response.status} ${url}`);
  }
  const csv = await response.text();
  return { url, csv, reports: parseSpcHailCsv(csv, occurredOn) };
}

export async function collectReports(opts: IngestOptions = {}): Promise<{
  reports: HailReport[];
  sources: string[];
  usedSample: boolean;
  swath: HailSwath | null;
}> {
  const sources: string[] = [];
  const reports: HailReport[] = [];
  if (opts.samplePath) {
    const csv = readFileSync(opts.samplePath, "utf8");
    const stamp = opts.samplePath.match(/(\d{6})/)?.[1] ?? "260510";
    reports.push(...parseSpcHailCsv(csv, dateFromSpcStamp(stamp)));
    sources.push(`sample ${opts.samplePath}`);
    return { reports, sources, usedSample: true, swath: null };
  }

  const days = opts.days ?? 7;
  const end = opts.end ?? new Date();
  const errors: string[] = [];
  for (let offset = 0; offset < days; offset++) {
    const date = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - offset));
    try {
      const day = await fetchSpcDay(date);
      reports.push(...day.reports);
      sources.push(day.url);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (opts.includeNws !== false) {
    try {
      const nws = await fetchNwsHailAlerts(end.toISOString().slice(0, 10));
      reports.push(...nws);
      sources.push("https://api.weather.gov/alerts?event=Hail");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (reports.length === 0) {
    const fallback = join(process.cwd(), "data/samples/spc-260510-hail.csv");
    const csv = readFileSync(fallback, "utf8");
    reports.push(...parseSpcHailCsv(csv, "2026-05-10"));
    sources.push(`recorded sample ${fallback}${errors.length ? ` (live fetch failed: ${errors.join("; ")})` : ""}`);
    return { reports, sources, usedSample: true, swath: null };
  }

  const swath = await fetchMrmsMeshSwath(end.toISOString().slice(0, 10));
  if (swath) sources.push("NOAA MRMS MESH");
  return { reports, sources, usedSample: false, swath };
}

export async function persistStormDrafts(drafts: StormDraft[]) {
  const results: { slug: string; id: string; action: "created" | "updated" | "skipped" }[] = [];
  for (const draft of drafts) {
    const existing = await prisma.storm.findUnique({ where: { slug: draft.slug } });
    if (existing && existing.status !== "DETECTED") {
      results.push({ slug: draft.slug, id: existing.id, action: "skipped" });
      continue;
    }
    const data = {
      name: draft.name,
      occurredOn: new Date(`${draft.occurredOn}T12:00:00.000Z`),
      states: draft.states.join(","),
      peakHailInches: draft.peakHailInches,
      source: draft.source,
      offerText: existing?.offerText || DEFAULT_STORM_OFFER,
      headline: existing?.headline ?? null,
    };
    const storm = existing
      ? await prisma.storm.update({ where: { id: existing.id }, data })
      : await prisma.storm.create({
          data: {
            ...data,
            slug: draft.slug,
            status: "DETECTED",
          },
        });
    if (existing) {
      await prisma.stormZip.deleteMany({ where: { stormId: storm.id } });
    }
    if (draft.zips.length) {
      await prisma.stormZip.createMany({
        data: draft.zips.map((zip) => ({
          stormId: storm.id,
          zip: zip.zip,
          city: zip.city,
          county: zip.county,
          state: zip.state,
          maxHailInches: zip.maxHailInches,
          lat: zip.lat,
          lon: zip.lon,
        })),
      });
    }
    results.push({ slug: draft.slug, id: storm.id, action: existing ? "updated" : "created" });
  }
  return results;
}

export async function runStormIngest(opts: IngestOptions = {}) {
  const collected = await collectReports(opts);
  const drafts = buildStormDrafts(collected.reports, collected.swath);
  const persisted = opts.persist === false ? [] : await persistStormDrafts(drafts);
  return { ...collected, drafts, persisted };
}
