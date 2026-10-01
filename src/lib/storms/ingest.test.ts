import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { clusterReports, draftFromCluster } from "@/lib/storms/cluster";
import { parseCsv } from "@/lib/storms/csv";
import { parseNwsHailAlerts } from "@/lib/storms/nws";
import { dateFromSpcStamp, parseSpcHailCsv } from "@/lib/storms/spc";
import { loadZipCentroids, zipsFromReportRadius, zipsFromSwath } from "@/lib/storms/zips";
import { buildStormDrafts } from "@/lib/storms/ingest";

const sample = readFileSync(join(process.cwd(), "data/samples/spc-260510-hail.csv"), "utf8");

describe("SPC hail CSV", () => {
  it("parses hundredths of an inch and keeps TX/OK/AR/MO reports", () => {
    const reports = parseSpcHailCsv(sample, dateFromSpcStamp("260510"));
    expect(reports.length).toBeGreaterThan(8);
    expect(reports.every((report) => ["TX", "OK", "AR", "MO"].includes(report.state))).toBe(true);
    const snyder = reports.find((report) => /Snyder/i.test(report.location));
    expect(snyder?.hailInches).toBe(1.75);
    expect(reports.some((report) => report.state === "FL")).toBe(false);
  });
});

describe("clustering + ZIP radius", () => {
  it("groups nearby same-day reports and maps ZIPs around them", () => {
    const reports = parseSpcHailCsv(sample, "2026-05-10");
    const clusters = clusterReports(reports);
    expect(clusters.length).toBeGreaterThan(0);
    const eastTexas = clusters.find((group) =>
      group.some((report) => /Quitman|Hawkins/i.test(report.location)),
    );
    expect(eastTexas).toBeTruthy();
    const draft = draftFromCluster(eastTexas!);
    expect(draft.occurredOn).toBe("2026-05-10");
    expect(draft.peakHailInches).toBeGreaterThanOrEqual(1);
    expect(draft.slug).toMatch(/2026-05-10/);

    const zips = zipsFromReportRadius(eastTexas!, loadZipCentroids(), 12);
    expect(zips.length).toBeGreaterThan(0);
    expect(zips.every((zip) => zip.state === "TX")).toBe(true);
    expect(zips[0].maxHailInches).toBeGreaterThanOrEqual(1);
  });

  it("lets an MRMS-style swath replace the report radius", () => {
    const zips = zipsFromSwath(
      { source: "MRMS_MESH", cells: [{ lat: 32.79, lon: -95.44, hailInches: 1.75 }] },
      loadZipCentroids(),
      6,
    );
    expect(zips.some((zip) => zip.city.toLowerCase().includes("quitman") || zip.zip.startsWith("757"))).toBe(
      true,
    );
  });

  it("builds persistable drafts from the recorded sample", () => {
    const drafts = buildStormDrafts(parseSpcHailCsv(sample, "2026-05-10"));
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.every((draft) => draft.zips.length > 0)).toBe(true);
  });
});

describe("NWS alert parse", () => {
  it("keeps service-area hail points", () => {
    const reports = parseNwsHailAlerts(
      {
        features: [
          {
            properties: {
              event: "Hail",
              areaDesc: "Dallas, TX",
              onset: "2026-05-10T20:00:00Z",
              parameters: { maxHailSize: ["1.25"] },
            },
            geometry: { type: "Point", coordinates: [-96.8, 32.78] },
          },
          {
            properties: { event: "Hail", areaDesc: "Denver, CO" },
            geometry: { type: "Point", coordinates: [-104.99, 39.74] },
          },
        ],
      },
      "2026-05-10",
    );
    expect(reports).toHaveLength(1);
    expect(reports[0].state).toBe("TX");
    expect(reports[0].hailInches).toBe(1.25);
  });
});

describe("CSV helper", () => {
  it("keeps commas inside quotes", () => {
    const rows = parseCsv('a,b\n"x,y",z\n');
    expect(rows[1]).toEqual(["x,y", "z"]);
  });
});
