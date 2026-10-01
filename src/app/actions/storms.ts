"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { text } from "@/lib/form-data";
import { loadZipCentroids } from "@/lib/storms/zips";
import type { StormStatus } from "@prisma/client";

async function loadStorm(id: string) {
  const storm = await prisma.storm.findUnique({ where: { id } });
  if (!storm) throw new Error("Storm not found");
  return storm;
}

export async function updateStormOfferAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  await prisma.storm.update({
    where: { id },
    data: {
      name: text(formData, "name").trim() || (await loadStorm(id)).name,
      headline: text(formData, "headline").trim() || null,
      offerText: text(formData, "offerText").trim(),
      notes: text(formData, "notes").trim() || null,
    },
  });
  revalidatePath(`/storms/${id}`);
  revalidatePath("/storms");
}

export async function setStormStatusAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status") as StormStatus;
  if (!["APPROVED", "ACTIVE", "CLOSED", "DETECTED"].includes(status)) {
    throw new Error("Invalid storm status");
  }
  await prisma.storm.update({ where: { id }, data: { status } });
  revalidatePath(`/storms/${id}`);
  revalidatePath("/storms");
  revalidatePath("/leads");
}

export async function removeStormZipAction(formData: FormData) {
  await requireAdmin();
  const stormId = text(formData, "stormId");
  const zipId = text(formData, "zipId");
  await prisma.stormZip.delete({ where: { id: zipId } });
  revalidatePath(`/storms/${stormId}`);
}

export async function addStormZipsAction(formData: FormData) {
  await requireAdmin();
  const stormId = text(formData, "stormId");
  const raw = text(formData, "zips");
  const requested = raw
    .split(/[\s,]+/)
    .map((zip) => zip.replace(/\D/g, "").slice(0, 5))
    .filter((zip) => zip.length === 5);
  const centroids = loadZipCentroids();
  const storm = await prisma.storm.findUnique({
    where: { id: stormId },
    include: { zips: true },
  });
  if (!storm) redirect("/storms");
  const existing = new Set(storm.zips.map((row) => row.zip));
  const peak = storm.peakHailInches;
  for (const zip of requested) {
    if (existing.has(zip)) continue;
    const match = centroids.find((row) => row.zip === zip);
    await prisma.stormZip.create({
      data: {
        stormId,
        zip,
        city: match?.city || "Unknown",
        county: match?.county || "",
        state: match?.state || storm.states.split(",")[0] || "TX",
        maxHailInches: peak,
        lat: match?.lat || 0,
        lon: match?.lon || 0,
      },
    });
    existing.add(zip);
  }
  revalidatePath(`/storms/${stormId}`);
}
