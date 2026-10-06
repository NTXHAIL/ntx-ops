import { describe, expect, it } from "vitest";
import { shouldSeedDemoData } from "@/lib/seed-policy";

describe("shouldSeedDemoData", () => {
  it("seeds only when the database has no users", () => {
    expect(shouldSeedDemoData(0)).toBe(true);
    expect(shouldSeedDemoData(1)).toBe(false);
    expect(shouldSeedDemoData(4)).toBe(false);
  });
});
