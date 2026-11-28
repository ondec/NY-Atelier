import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { canManageCatalogue, studioSameOrigin } from "@/lib/studio-access";
export const runtime = "nodejs";

/** What the hero panel may upload: photos up to 15 MB, launch videos up to 100 MB. */
const kinds: Record<string, { extension: string; limit: number }> = {
  "image/jpeg": { extension: "jpg", limit: 15 * 1024 * 1024 },
  "image/png": { extension: "png", limit: 15 * 1024 * 1024 },
  "image/webp": { extension: "webp", limit: 15 * 1024 * 1024 },
  "video/mp4": { extension: "mp4", limit: 100 * 1024 * 1024 },
  "video/webm": { extension: "webm", limit: 100 * 1024 * 1024 },
};

/**
 * Saves a hero photo or video and returns its path on NY Team (e.g. /uploads/heroes/x.mp4).
 * For now files are kept in the portal's own public folder, which works locally; online this moves to file storage (R2).
 */
export async function POST(request: Request) {
  if (!await canManageCatalogue(request) || !studioSameOrigin(request)) return Response.json({ message: "Manage the catalogue in NY Office." }, { status: 403 });
  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return Response.json({ message: "Choose a file to upload." }, { status: 422 });
  const kind = kinds[file.type];
  if (!kind) return Response.json({ message: "Choose a JPG, PNG or WebP photo, or an MP4 or WebM video." }, { status: 422 });
  if (file.size > kind.limit) return Response.json({ message: file.type.startsWith("video/") ? "Videos can be up to 100 MB." : "Photos can be up to 15 MB." }, { status: 422 });
  const folder = path.join(process.cwd(), "public", "uploads", "heroes");
  const name = `${randomUUID()}.${kind.extension}`;
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ path: `/uploads/heroes/${name}` });
}
