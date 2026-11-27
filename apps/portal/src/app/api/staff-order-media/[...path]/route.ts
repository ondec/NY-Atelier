import { readStaff, staffBackendHeaders } from "@/lib/staff-session";
import { can } from "@/lib/staff-permissions";
import { sameOrigin } from "@/lib/request-security";
import { fittingRequestBody } from "@/lib/fitting-request";

/** Office, Studio and Production staff may reach order media; the API decides per order. */
async function mediaAccessError(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "Open this page to save changes." }, { status: 403 });
  const staff = await readStaff(request);
  if (!staff) return Response.json({ message: "Sign in with your staff account." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return can(staff, "orders.read") || can(staff, "production") ? null : Response.json({ message: "This action is not available for your staff role." }, { status: 403 });
}

export const runtime = "nodejs";
const base = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
type Context = { params: Promise<{ path: string[] }> };
const reference = /^[A-Z0-9-]{3,40}$/;
const uuid = /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const target = (path: string[]) => `${base}/api/demo/staff/orders/${encodeURIComponent(path[0])}/attachments${path[1] ? `/${encodeURIComponent(path[1])}` : ""}`;

/** Order inspiration photos and videos: view (streamed), add, remove. The API decides who may do each. */
export async function GET(request: Request, { params }: Context) {
  const denied = await mediaAccessError(request); if (denied) return denied;
  const { path } = await params;
  if (path.length !== 2 || !reference.test(path[0]) || !uuid.test(path[1])) return Response.json({ message: "Attachment not found." }, { status: 404 });
  try {
    const headers = await staffBackendHeaders(request);
    const range = request.headers.get("range");
    if (range) headers.Range = range;
    const result = await fetch(target(path), { headers, cache: "no-store", signal: AbortSignal.timeout(30000) });
    if (!result.ok && result.status !== 416) return Response.json({ message: "Attachment unavailable." }, { status: result.status });
    const outgoing = new Headers({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Vary": "Cookie" });
    for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "content-disposition"]) {
      const value = result.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    return new Response(result.body, { status: result.status, headers: outgoing });
  } catch {
    return Response.json({ message: "Attachment unavailable. Try again." }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: Context) {
  const denied = await mediaAccessError(request); if (denied) return denied;
  const { path } = await params;
  const type = request.headers.get("content-type") ?? "";
  if (path.length !== 1 || !reference.test(path[0])) return Response.json({ message: "Order not found." }, { status: 404 });
  if (!type.startsWith("multipart/form-data;")) return Response.json({ message: "Choose photos or videos to upload." }, { status: 415 });
  try {
    const body = await fittingRequestBody(request);
    const headers = { ...await staffBackendHeaders(request), "Content-Type": type };
    const result = await fetch(target(path), { method: "POST", body, headers, cache: "no-store", signal: AbortSignal.timeout(120000) });
    return Response.json(await result.json(), { status: result.status });
  } catch (failure) {
    return Response.json({ message: failure instanceof Error && failure.message.includes("60 MB") ? "Keep the photos and videos under 60 MB in total." : "The upload didn’t finish. Try again." }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const denied = await mediaAccessError(request); if (denied) return denied;
  const { path } = await params;
  if (path.length !== 2 || !reference.test(path[0]) || !uuid.test(path[1])) return Response.json({ message: "Attachment not found." }, { status: 404 });
  try {
    const result = await fetch(target(path), { method: "DELETE", headers: await staffBackendHeaders(request), cache: "no-store", signal: AbortSignal.timeout(15000) });
    return Response.json(await result.json(), { status: result.status });
  } catch {
    return Response.json({ message: "Could not remove the file. Try again." }, { status: 503 });
  }
}
