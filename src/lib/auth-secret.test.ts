import { describe, expect, it } from "vitest";
import { productionAuthSecretError } from "@/lib/auth-secret";

describe("productionAuthSecretError", () => {
  it("explains a missing secret", () => {
    const message = productionAuthSecretError("");
    expect(message).toContain("AUTH_SECRET is missing");
    expect(message).toContain("Settings → Environment Variables");
    expect(message).toContain("https://generate-secret.vercel.app/32");
  });

  it("rejects the example placeholder", () => {
    expect(productionAuthSecretError("replace-with-a-long-random-string")).toContain(
      "example placeholder",
    );
  });

  it("rejects a short secret", () => {
    expect(productionAuthSecretError("short-but-not-placeholder")).toContain("too short");
  });

  it("accepts a long random secret", () => {
    expect(productionAuthSecretError("a".repeat(32))).toBeNull();
  });
});
