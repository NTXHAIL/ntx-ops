import { runStormIngest } from "../src/lib/storms/ingest";

async function main() {
  const daysFlag = process.argv.find((arg) => arg.startsWith("--days="));
  const sampleFlag = process.argv.find((arg) => arg.startsWith("--sample="));
  const days = daysFlag ? Number(daysFlag.slice("--days=".length)) : 7;
  const samplePath = sampleFlag ? sampleFlag.slice("--sample=".length) : undefined;
  const dry = process.argv.includes("--dry-run");

  const result = await runStormIngest({
    days,
    samplePath,
    persist: !dry,
    includeNws: !samplePath,
  });

  console.log(
    JSON.stringify(
      {
        usedSample: result.usedSample,
        sources: result.sources,
        reports: result.reports.length,
        storms: result.drafts.map((draft) => ({
          slug: draft.slug,
          name: draft.name,
          zips: draft.zips.length,
          peak: draft.peakHailInches,
          states: draft.states,
        })),
        persisted: result.persisted,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
