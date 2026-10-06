import { describe, expect, it } from "vitest";
import { describeSetup } from "@/lib/setup-status";

describe("describeSetup", () => {
  it("stays quiet when the database is connected", () => {
    expect(describeSetup({ database: true, authMessage: "AUTH_SECRET is missing.", blob: false })).toBeNull();
  });

  it("lists Neon, Blob, the login secret, and a redeploy when the database is missing", () => {
    const steps = describeSetup({
      database: false,
      authMessage: "AUTH_SECRET is missing. Add it in Settings.",
      blob: false,
    });
    expect(steps?.map((step) => step.title)).toEqual([
      "Delete old Supabase variables",
      "Connect Neon Postgres",
      "Connect a Blob store",
      "Add AUTH_SECRET",
      "Redeploy",
    ]);
    expect(steps?.[0]?.detail).toContain("before you connect Neon");
    expect(steps?.[3]?.detail).toContain("AUTH_SECRET is missing");
    expect(steps?.[2]?.detail).toContain("BLOB_READ_WRITE_TOKEN");
  });

  it("does not ask to replace a login secret that is already set", () => {
    const steps = describeSetup({ database: false, authMessage: null, blob: true });
    expect(steps?.[3]?.detail).toContain("already set");
    expect(steps?.[2]?.detail).toContain("already connected");
  });
});
