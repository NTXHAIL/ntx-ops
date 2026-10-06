import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { del, get, put } from "@vercel/blob";

type BlobAccess = "private" | "public";

const MISSING_BLOB_MESSAGE =
  "Photo storage is not configured. In the Vercel project, open the Storage tab, create a Blob store, and connect it to this project so BLOB_READ_WRITE_TOKEN is set. Then redeploy.";

let blobAccess: BlobAccess | null = null;

export function resetBlobStorageForTests() {
  blobAccess = null;
}

function envValue(name: string) {
  return process.env[name]?.trim() || "";
}

export function usesBlobStorage() {
  return Boolean(envValue("BLOB_READ_WRITE_TOKEN") || envValue("BLOB_STORE_ID"));
}

export function alternateBlobAccess(attempted: BlobAccess, error: unknown): BlobAccess | null {
  if (!(error instanceof Error)) return null;
  const message = error.message.toLowerCase();
  if (message.includes("valid token") || message.includes("access denied")) return null;
  const other: BlobAccess = attempted === "private" ? "public" : "private";
  const talksAboutAccess = message.includes("access") || message.includes("store");
  if (!talksAboutAccess || !message.includes(other)) return null;
  return other;
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
  if (usesBlobStorage()) {
    await putBlob(key, bytes, contentType || contentTypeForPath(publicPath));
    return;
  }
  const file = localFile(key);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, bytes);
}

export async function readStoredObject(publicPath: string) {
  const key = storageKeyFromPublicPath(publicPath);
  if (!key) return null;
  if (usesBlobStorage()) return readBlob(key, publicPath);
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
  if (usesBlobStorage()) {
    await deleteBlob(key);
    return;
  }
  await rm(localFile(key), { force: true });
}

function blobToken() {
  const token = envValue("BLOB_READ_WRITE_TOKEN");
  return token ? { token } : {};
}

async function putBlob(key: string, bytes: Buffer, contentType: string) {
  const preferred = blobAccess ?? "private";
  try {
    await writeBlob(key, bytes, contentType, preferred);
    blobAccess = preferred;
  } catch (error) {
    const other = alternateBlobAccess(preferred, error);
    if (!other) throw error;
    await writeBlob(key, bytes, contentType, other);
    blobAccess = other;
  }
}

async function writeBlob(key: string, bytes: Buffer, contentType: string, access: BlobAccess) {
  await put(key, bytes, {
    access,
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    ...blobToken(),
  });
}

async function readBlob(key: string, publicPath: string) {
  const order: BlobAccess[] = blobAccess ? [blobAccess] : ["private", "public"];
  for (const access of order) {
    try {
      const result = await get(key, { access, ...blobToken() });
      if (!result || result.statusCode !== 200 || !result.stream) {
        if (!blobAccess && access === "private") continue;
        return null;
      }
      blobAccess = access;
      const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
      const contentType = result.blob.contentType || contentTypeForPath(publicPath);
      return { bytes, contentType };
    } catch (error) {
      const other = alternateBlobAccess(access, error);
      if (other && !blobAccess) continue;
      throw error;
    }
  }
  return null;
}

async function deleteBlob(key: string) {
  const order: BlobAccess[] = blobAccess ? [blobAccess] : ["private", "public"];
  let lastError: unknown;
  for (const access of order) {
    try {
      await del(key, blobToken());
      blobAccess = access;
      return;
    } catch (error) {
      if (isMissingBlob(error)) return;
      const other = alternateBlobAccess(access, error);
      if (other && !blobAccess) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  if (lastError) throw lastError;
}

function isMissingBlob(error: unknown) {
  return error instanceof Error && /does not exist|not found/i.test(error.message);
}

function localRoot() {
  if (process.env.NODE_ENV === "production" && !usesBlobStorage()) {
    throw new Error(MISSING_BLOB_MESSAGE);
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
