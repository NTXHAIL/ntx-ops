import { describe, expect, it } from "vitest";
import { decodeVinLocalWmi, decodeVinWithNhtsa, normalizeVin } from "@/lib/vin";

describe("normalizeVin", () => {
  it("strips junk and uppercases", () => {
    expect(normalizeVin("1ft ew1e49kfb48221")).toBe("1FTEW1E49KFB48221");
  });
});

describe("decodeVinWithNhtsa", () => {
  it("rejects short VINs without calling the network", async () => {
    const result = await decodeVinWithNhtsa("TOO-SHORT");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("17");
    }
  });
});

describe("decodeVinLocalWmi", () => {
  it("reads year and make from a 17-character VIN", () => {
    const decoded = decodeVinLocalWmi("1FTEW1E49KFB48221");
    expect(decoded?.make).toBe("Ford");
    expect(decoded?.year).toBe("2019");
  });
});
