import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { estimatePhotoPath, putStoredObject } from "@/lib/object-storage";

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Sign in again before uploading photos." }, { status: 401 });
  }

  const estimateId = new URL(request.url).searchParams.get("estimateId")?.trim() || "";
  if (!/^[A-Za-z0-9_-]+$/.test(estimateId)) {
    return Response.json({ error: "Save the estimate before adding photos." }, { status: 400 });
  }

  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId },
    select: { id: true, createdById: true, status: true },
  });
  if (!estimate) return Response.json({ error: "Estimate not found." }, { status: 404 });
  if (estimate.status !== "DRAFT") {
    return Response.json({ error: "Only draft estimates can take new photos." }, { status: 400 });
  }
  if (session.role !== "ADMIN" && estimate.createdById !== session.id) {
    return Response.json({ error: "You cannot add photos to that estimate." }, { status: 403 });
  }

  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) {
    return Response.json({ error: "Upload an image file." }, { status: 400 });
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0) return Response.json({ error: "That photo was empty." }, { status: 400 });
  if (bytes.length > MAX_BYTES) {
    return Response.json({ error: "That photo is too large. Try one photo at a time." }, { status: 413 });
  }

  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const fileName = `${randomUUID()}.${ext}`;
  const path = estimatePhotoPath(estimateId, fileName);
  try {
    await putStoredObject(path, bytes, contentType === "image/jpg" ? "image/jpeg" : contentType);
  } catch (error) {
    console.error("estimate photo upload failed", error);
    return Response.json({ error: "The photo could not be stored. Try again." }, { status: 500 });
  }

  return Response.json({ path, name: fileName });
}
