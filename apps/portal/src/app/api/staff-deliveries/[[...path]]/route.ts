import type { StaffPermission } from "@/lib/staff-permissions";
import { staffBackendHeaders, staffRequestError } from "@/lib/staff-session";

export const runtime = "nodejs";
const base = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
type Context = { params: Promise<{ path?: string[] }> };
type Method = "GET" | "POST" | "PATCH";
const reference = /^[A-Z0-9-]{3,40}$/;
const id = /^\d{1,9}$/;

/**
 * Deliveries. Couriers: their deliveries, a planned route, starting a route and confirming each stop.
 * Order desk (orders.manage): couriers, delivery areas and shops, and an order's courier and area.
 */
function target(method: Method, path: string[]): { url: string; permission: StaffPermission } | undefined {
  const [first, second, third] = path;
  if (method === "GET" && path.length === 0) return { url: "/deliveries", permission: "deliveries" };
  if (method === "GET" && path.length === 1 && first === "couriers") return { url: "/couriers", permission: "orders.manage" };
  if (method === "GET" && path.length === 1 && first === "settings") return { url: "/delivery-settings", permission: "orders.manage" };
  if (method === "POST" && path.length === 1 && (first === "route" || first === "start")) return { url: `/deliveries/${first}`, permission: "deliveries" };
  if (method === "POST" && path.length === 2 && reference.test(first) && (second === "delivered" || second === "postpone")) return { url: `/deliveries/${encodeURIComponent(first)}/${second}`, permission: "deliveries" };
  if (first === "settings" && (second === "zones" || second === "start-points")) {
    if (method === "POST" && path.length === 2) return { url: `/delivery-settings/${second}`, permission: "orders.manage" };
    if (method === "PATCH" && path.length === 3 && id.test(third)) return { url: `/delivery-settings/${second}/${third}`, permission: "orders.manage" };
  }
  if (method === "PATCH" && first === "orders" && reference.test(second ?? "")) {
    if (path.length === 2) return { url: `/orders/${encodeURIComponent(second)}/courier`, permission: "orders.manage" };
    if (path.length === 3 && third === "zone") return { url: `/orders/${encodeURIComponent(second)}/delivery-zone`, permission: "orders.manage" };
  }
  return undefined;
}

async function forward(request: Request, context: Context, method: Method) {
  const route = target(method, (await context.params).path ?? []);
  if (!route) return Response.json({ message: "Not found." }, { status: 404 });
  const denied = await staffRequestError(request, route.permission); if (denied) return denied;
  let body: string | undefined;
  if (method !== "GET") {
    const data = await request.json().catch(() => null);
    if (!data || typeof data !== "object") return Response.json({ message: "Expected JSON." }, { status: 422 });
    body = JSON.stringify(data);
  }
  try {
    const response = await fetch(`${base}/api/demo/staff${route.url}`, {
      method, body, cache: "no-store", headers: await staffBackendHeaders(request),
      signal: AbortSignal.timeout(route.url.endsWith("/route") ? 20000 : method === "GET" ? 8000 : 15000),
    });
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Deliveries are unavailable. Check the connection and try again." }, { status: 503 });
  }
}

export const GET = (request: Request, context: Context) => forward(request, context, "GET");
export const POST = (request: Request, context: Context) => forward(request, context, "POST");
export const PATCH = (request: Request, context: Context) => forward(request, context, "PATCH");
