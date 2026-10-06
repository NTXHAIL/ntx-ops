import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

const DEFAULT_BUCKET = "estimate-photos";

let bucketReady = false;

export function usesSupabaseStorage() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function storageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;
}

export function storageKeyFromPublicPath(publicPath: string) {
  if (!publicPath || publicPath.includes("..") || publicPath.includes("\\")) return null;
  const estimate = publicPath.match(/^\/estimate-photos\/([A-Za-z0-9_-]+)\/([A-Za-z0-9._-]+)$/);
  if (estimate && !estimate[2].includes("..")) {
    return `estimates/${estimate[1]}/${estimate[2]}`;
  }
  const lead = publicPath.match(/^\/lead-photos\/([A-Za-z0-9._-]+)$/);
  if (lead && !lead[1].includes("..")) return `leads/${lead[1]}`;
  return null;
}

export function isEstimatePhotoPath(publicPath: string, estimateId: string) {
  return (
    publicPath.startsWith(`/estimate-photos/${estimateId}/`) &&
    storageKeyFromPublicPath(publicPath)?.startsWith(`estimates/${estimateId}/`) === true
  );
}

export function estimatePhotoPath(estimateId: string, fileName: string) {
  return `/estimate-photos/${estimateId}/${fileName}`;
}

export function leadPhotoPath(fileName: string) {
  return `/lead-photos/${fileName}`;
}

export function contentTypeForPath(publicPath: string) {
  const lower = publicPath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export async function putStoredObject(publicPath: string, bytes: Buffer, contentType: string) {
  const key = storageKeyFromPublicPath(publicPath);
  if (!key) throw new Error("Invalid photo path.");
  if (usesSupabaseStorage()) {
    await ensureSupabaseBucket();
    const response = await fetch(objectUrl(key), {
      method: "POST",
      headers: {
        ...supabaseHeaders(),
        "Content-Type": contentType || contentTypeForPath(publicPath),
        "x-upsert": "true",
      },
      body: new Uint8Array(bytes),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Could not store photo (${response.status}). ${detail}`.trim());
    }
    return;
  }
  const file = localFile(key);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, bytes);
}

export async function readStoredObject(publicPath: string) {
  const key = storageKeyFromPublicPath(publicPath);
  if (!key) return null;
  if (usesSupabaseStorage()) {
    const response = await fetch(objectUrl(key), { headers: supabaseHeaders() });
    if (response.status === 404 || response.status === 400) return null;
    if (!response.ok) {
      throw new Error(`Could not read photo (${response.status}).`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      contentTypeForPath(publicPath);
    return { bytes, contentType };
  }
  try {
    const bytes = new Uint8Array(await readFile(localFile(key)));
    return { bytes, contentType: contentTypeForPath(publicPath) };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function deleteStoredObject(publicPath: string) {
  const key = storageKeyFromPublicPath(publicPath);
  if (!key) return;
  if (usesSupabaseStorage()) {
    const response = await fetch(objectUrl(key), {
      method: "DELETE",
      headers: supabaseHeaders(),
    });
    if (response.ok || response.status === 404) return;
    return;
  }
  await rm(localFile(key), { force: true });
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
  };
}

function objectUrl(key: string) {
  const base = process.env.SUPABASE_URL?.trim().replace(/\/$/, "") || "";
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/${encodeURIComponent(storageBucket())}/${encoded}`;
}

async function ensureSupabaseBucket() {
  if (bucketReady) return;
  const base = process.env.SUPABASE_URL?.trim().replace(/\/$/, "") || "";
  const bucket = storageBucket();
  const response = await fetch(`${base}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: bucket, name: bucket, public: false }),
  });
  if (response.ok || response.status === 409) {
    bucketReady = true;
    return;
  }
  const detail = await response.text().catch(() => "");
  if (/already exists/i.test(detail)) {
    bucketReady = true;
    return;
  }
  throw new Error(`Could not create the photo bucket (${response.status}). ${detail}`.trim());
}

function localRoot() {
  if (process.env.NODE_ENV === "production" && !usesSupabaseStorage()) {
    throw new Error(
      "Photo storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return resolve(process.cwd(), ".data", "object-storage");
}

function localFile(key: string) {
  const root = localRoot();
  const file = resolve(root, ...key.split("/"));
  if (file !== root && !file.startsWith(root + sep)) {
    throw new Error("Invalid photo path.");
  }
  return file;
}

function isNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}
