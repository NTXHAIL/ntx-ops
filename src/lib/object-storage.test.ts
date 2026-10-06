import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const blobState = vi.hoisted(() => {
  const state = {
    forcePublicStore: false,
    files: new Map<string, { bytes: Buffer; contentType: string; access: string }>(),
  };
  return {
    state,
    put: vi.fn(
      async (
        pathname: string,
        body: Buffer,
        options: { access: string; contentType?: string; addRandomSuffix?: boolean; allowOverwrite?: boolean; token?: string },
      ) => {
        if (state.forcePublicStore && options.access === "private") {
          throw new Error(
            "Invalid access level. The store is public, but the request specified private.",
          );
        }
        state.files.set(pathname, {
          bytes: Buffer.from(body),
          contentType: options.contentType || "application/octet-stream",
          access: options.access,
        });
        return { pathname, url: `https://example.blob.vercel-storage.com/${pathname}` };
      },
    ),
    get: vi.fn(async (pathname: string, options: { access: string }) => {
      const saved = state.files.get(pathname);
      if (!saved || saved.access !== options.access) return null;
      const bytes = saved.bytes;
      return {
        statusCode: 200 as const,
        stream: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
        blob: { contentType: saved.contentType },
      };
    }),
    del: vi.fn(async (pathname: string) => {
      if (!state.files.has(pathname)) throw new Error("The requested blob does not exist");
      state.files.delete(pathname);
    }),
  };
});

vi.mock("@vercel/blob", () => ({
  put: blobState.put,
  get: blobState.get,
  del: blobState.del,
}));

import {
  alternateBlobAccess,
  contentTypeForPath,
  deleteStoredObject,
  isEstimatePhotoPath,
  putStoredObject,
  readStoredObject,
  resetBlobStorageForTests,
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

describe("alternateBlobAccess", () => {
  it("switches to public when the store rejects private access", () => {
    expect(
      alternateBlobAccess(
        "private",
        new Error("Invalid access level. The store is public, but the request specified private."),
      ),
    ).toBe("public");
  });

  it("does not treat a bad token as an access-mode mismatch", () => {
    expect(
      alternateBlobAccess("private", new Error("Access denied, please provide a valid token for this resource.")),
    ).toBeNull();
  });
});

describe("local photo fallback", () => {
  const previousToken = process.env.BLOB_READ_WRITE_TOKEN;
  const previousStore = process.env.BLOB_STORE_ID;
  const path = "/estimate-photos/est_local/photo.jpg";

  beforeEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    blobState.state.files.clear();
    blobState.put.mockClear();
    resetBlobStorageForTests();
  });

  afterEach(async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    await deleteStoredObject(path);
    if (previousToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = previousToken;
    if (previousStore === undefined) delete process.env.BLOB_STORE_ID;
    else process.env.BLOB_STORE_ID = previousStore;
  });

  it("stores and reads a photo on disk when Blob is not configured", async () => {
    const bytes = Buffer.from("jpeg-bytes");
    await putStoredObject(path, bytes, "image/jpeg");
    expect(blobState.put).not.toHaveBeenCalled();
    const stored = await readStoredObject(path);
    expect(stored?.contentType).toBe("image/jpeg");
    expect(Buffer.from(stored?.bytes || []).toString()).toBe("jpeg-bytes");
    await deleteStoredObject(path);
    expect(await readStoredObject(path)).toBeNull();
  });

  it("refuses local disk in production when Blob is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(putStoredObject(path, Buffer.from("x"), "image/jpeg")).rejects.toThrow(
      /BLOB_READ_WRITE_TOKEN/,
    );
    vi.unstubAllEnvs();
  });
});

describe("vercel blob adapter", () => {
  const path = "/estimate-photos/est_blob/photo.jpg";

  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_token";
    delete process.env.BLOB_STORE_ID;
    blobState.state.files.clear();
    blobState.state.forcePublicStore = false;
    blobState.put.mockClear();
    blobState.get.mockClear();
    blobState.del.mockClear();
    resetBlobStorageForTests();
  });

  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    blobState.state.forcePublicStore = false;
    resetBlobStorageForTests();
  });

  it("stores a private blob and reads it back through the app path", async () => {
    await putStoredObject(path, Buffer.from("jpeg-bytes"), "image/jpeg");
    expect(blobState.put).toHaveBeenCalledWith(
      "estimates/est_blob/photo.jpg",
      expect.any(Buffer),
      expect.objectContaining({
        access: "private",
        contentType: "image/jpeg",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: "vercel_blob_rw_test_token",
      }),
    );
    const stored = await readStoredObject(path);
    expect(blobState.get).toHaveBeenCalledWith(
      "estimates/est_blob/photo.jpg",
      expect.objectContaining({ access: "private", token: "vercel_blob_rw_test_token" }),
    );
    expect(stored?.contentType).toBe("image/jpeg");
    expect(Buffer.from(stored?.bytes || []).toString()).toBe("jpeg-bytes");
    await deleteStoredObject(path);
    expect(blobState.del).toHaveBeenCalledWith("estimates/est_blob/photo.jpg", {
      token: "vercel_blob_rw_test_token",
    });
    expect(await readStoredObject(path)).toBeNull();
  });

  it("falls back to a public store and still uses the unguessable app path", async () => {
    blobState.state.forcePublicStore = true;
    await putStoredObject(path, Buffer.from("public-bytes"), "image/png");
    expect(blobState.put).toHaveBeenCalledTimes(2);
    expect(blobState.put).toHaveBeenLastCalledWith(
      "estimates/est_blob/photo.jpg",
      expect.any(Buffer),
      expect.objectContaining({ access: "public", addRandomSuffix: false }),
    );
    const stored = await readStoredObject(path);
    expect(Buffer.from(stored?.bytes || []).toString()).toBe("public-bytes");
    expect(stored?.contentType).toBe("image/png");
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
