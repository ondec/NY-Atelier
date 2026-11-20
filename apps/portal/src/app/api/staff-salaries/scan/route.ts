import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { staffRequestError } from "@/lib/staff-session";
import { salaryScanRows, type ScanBlock } from "@/lib/salary-scan";

export const runtime = "nodejs";
const run = promisify(execFile);
let scanning = false;
export async function POST(request: Request) {
  const denied = await staffRequestError(request, "finances"); if (denied) return denied;
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) return Response.json({ message: "Upload the photo from this portal." }, { status: 403 });
  if (process.platform !== "darwin") return Response.json({ message: "Photo reading is not connected on this server. Enter the form manually for now." }, { status: 503 });
  if (scanning) return Response.json({ message: "Another photo is being read. Please try again shortly." }, { status: 429 });
  if (Number(request.headers.get("content-length")) > 13 * 1024 * 1024) return Response.json({ message: "Choose a photo smaller than 12 MB." }, { status: 413 });
  let directory: string | undefined;
  scanning = true;
  try {
    const form = await request.formData() as unknown as { get(name: string): FormDataEntryValue | null };
    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size === 0 || photo.size > 12 * 1024 * 1024) return Response.json({ message: "Choose a JPG or PNG photo smaller than 12 MB." }, { status: 422 });
    const bytes = Buffer.from(await photo.arrayBuffer());
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if (!jpeg && !png) return Response.json({ message: "Use a JPG or PNG photo. Export HEIC photos as JPG first." }, { status: 422 });
    directory = await mkdtemp(path.join(tmpdir(), "ny-salary-scan-"));
    const file = path.join(directory, jpeg ? "form.jpg" : "form.png");
    await writeFile(file, bytes, { mode: 0o600 });
    const { stdout } = await run("/usr/bin/swift", [path.join(process.cwd(), "src/lib/salary-ocr.swift"), file], { timeout: 45000, maxBuffer: 1024 * 1024 });
    const blocks: ScanBlock[] = JSON.parse(stdout);
    return Response.json({ rows: salaryScanRows(blocks), text: blocks.sort((a,b) => b.y - a.y || a.x - b.x).map((block) => block.text).join("\n") }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ message: "Could not read this photo. Try a straight, well-lit photo of the front page, or enter the figures manually." }, { status: 422 }); }
  finally { scanning = false; if (directory) await rm(directory, { recursive: true, force: true }); }
}
