/**
 * Meta / Google ads (phase 2).
 *
 * Phase 1 never spends or launches campaigns. After Joseph approves a storm,
 * a later job can clone a template campaign into the storm's ZIP list.
 */
export type AdPlatform = "meta" | "google";

export type StormCampaignDraft = {
  stormId: string;
  zips: string[];
  dailyBudgetCents: number;
  platform: AdPlatform;
};

export type AdLauncher = {
  preview(draft: StormCampaignDraft): Promise<{ ok: true; dryRun: true }>;
  launch(draft: StormCampaignDraft): Promise<never>;
};

export function createAdLauncher(): AdLauncher {
  return {
    async preview() {
      return { ok: true, dryRun: true };
    },
    async launch() {
      throw new Error("Ad-platform launch is not enabled in Storm Leads phase 1.");
    },
  };
}
