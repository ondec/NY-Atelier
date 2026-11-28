import { staffBackendHeaders, staffRequestError } from "@/lib/staff-session";

export const runtime = "nodejs";
const base = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
type Context = { params: Promise<{ path?: string[] }> };

/** NY Production: list, order detail, tailor assignment, stage updates and sending an order back to the front desk. The API scopes tailors to their own orders. */
async function forward(request: Request, context: Context, method: "GET" | "PATCH" | "POST") {
  const path = (await context.params).path ?? [];
  // Anyone in NY Production may mark their own notifications as read.
  const seen = method === "POST" && path.length === 1 && path[0] === "seen";
  const denied = await staffRequestError(request, method === "GET" || seen ? "production" : "production.manage"); if (denied) return denied;
  const valid = seen || (method === "GET" ? path.length === 0 || (path.length === 1 && /^[A-Z0-9-]{3,40}$/.test(path[0]))
    : path.length === 2 && /^[A-Z0-9-]{3,40}$/.test(path[0]) && ["tailor", "workflow", "return", "to-reception"].includes(path[1]));
  if (!valid) return Response.json({ message: "Not found." }, { status: 404 });
  let body: string | undefined;
  if (method === "PATCH") {
    if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ message: "Expected JSON." }, { status: 415 });
    const data = await request.json().catch(() => null);
    if (!data || typeof data !== "object") return Response.json({ message: "Expected JSON." }, { status: 422 });
    const { reference: _reference, ...rest } = data as Record<string, unknown>; void _reference;
    body = JSON.stringify(rest);
  }
  try {
    const response = await fetch(`${base}/api/demo/staff/production${path.length ? `/${path.map(encodeURIComponent).join("/")}` : ""}`, {
      method: path[1] === "return" || path[1] === "to-reception" || seen ? "POST" : method, body, cache: "no-store", headers: await staffBackendHeaders(request), signal: AbortSignal.timeout(method === "GET" ? 8000 : 15000),
    });
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Production is unavailable. Check the connection and try again." }, { status: 503 });
  }
}

export const GET = (request: Request, context: Context) => forward(request, context, "GET");
export const PATCH = (request: Request, context: Context) => forward(request, context, "PATCH");
export const POST = (request: Request, context: Context) => forward(request, context, "POST");
