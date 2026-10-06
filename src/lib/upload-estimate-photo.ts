import type { DraftPhoto } from "@/lib/estimate-photos";

export function photoNeedsUpload(photo: { path?: string; dataUrl?: string; url: string }) {
  return Boolean((photo.dataUrl || photo.url.startsWith("data:")) && !photo.path);
}

export async function uploadEstimatePhoto(estimateId: string, photo: DraftPhoto): Promise<DraftPhoto> {
  const dataUrl = photo.dataUrl || (photo.url.startsWith("data:") ? photo.url : "");
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("That photo could not be read.");
  }
  const blob = await (await fetch(dataUrl)).blob();
  const response = await fetch(`/api/estimate-photos?estimateId=${encodeURIComponent(estimateId)}`, {
    method: "POST",
    headers: { "content-type": blob.type || "image/jpeg" },
    body: blob,
  });
  const body = (await response.json().catch(() => null)) as
    | { path?: string; name?: string; error?: string }
    | null;
  if (!response.ok || !body?.path) {
    throw new Error(body?.error || "Photo upload failed.");
  }
  return {
    ...photo,
    path: body.path,
    url: body.path,
    dataUrl: undefined,
    name: photo.name || body.name || "photo.jpg",
  };
}
