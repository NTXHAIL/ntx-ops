import { getSession } from "@/lib/auth";
import { estimatePhotoPath, readStoredObject } from "@/lib/object-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ estimateId: string; file: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { estimateId, file } = await params;
  if (!/^[A-Za-z0-9_-]+$/.test(estimateId) || !/^[A-Za-z0-9._-]+$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  const object = await readStoredObject(estimatePhotoPath(estimateId, file));
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.bytes, {
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
