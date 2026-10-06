import { afterEach, describe, expect, it } from "vitest";
import {
  contentTypeForPath,
  deleteStoredObject,
  isEstimatePhotoPath,
  putStoredObject,
  readStoredObject,
  storageKeyFromPublicPath,
} from "@/lib/object-storage";
import { sessionCookieOptions } from "@/lib/session";

describe("storage paths", () => {
  it("maps public photo urls onto private object keys", () => {
    expect(storageKeyFromPublicPath("/estimate-photos/est_1/photo.jpg")).toBe(
      "estimates/est_1/photo.jpg",
    );
    expect(storageKeyFromPublicPath("/lead-photos/abc.webp")).toBe("leads/abc.webp");
    expect(storageKeyFromPublicPath("/estimate-photos/est/../secret.jpg")).toBeNull();
    expect(storageKeyFromPublicPath("/public/estimate-photos/est/a.jpg")).toBeNull();
  });

  it("only accepts photos stored for that estimate", () => {
    expect(isEstimatePhotoPath("/estimate-photos/est_1/a.jpg", "est_1")).toBe(true);
    expect(isEstimatePhotoPath("/estimate-photos/other/a.jpg", "est_1")).toBe(false);
  });

  it("infers an image content type from the file name", () => {
    expect(contentTypeForPath("/estimate-photos/est/a.png")).toBe("image/png");
    expect(contentTypeForPath("/estimate-photos/est/a.jpg")).toBe("image/jpeg");
  });
});

describe("local photo fallback", () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const path = "/estimate-photos/est_local/photo.jpg";

  afterEach(async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await deleteStoredObject(path);
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  });

  it("stores and reads a photo when Supabase is not configured", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bytes = Buffer.from("jpeg-bytes");
    await putStoredObject(path, bytes, "image/jpeg");
    const stored = await readStoredObject(path);
    expect(stored?.contentType).toBe("image/jpeg");
    expect(Buffer.from(stored?.bytes || []).toString()).toBe("jpeg-bytes");
    await deleteStoredObject(path);
    expect(await readStoredObject(path)).toBeNull();
  });
});

describe("session cookie", () => {
  it("marks the cookie Secure on Vercel", () => {
    const previous = process.env.VERCEL;
    process.env.VERCEL = "1";
    const options = sessionCookieOptions();
    expect(options.secure).toBe(true);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
  });
});
