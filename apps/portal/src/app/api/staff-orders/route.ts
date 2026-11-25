import { staffRequestError, staffBackendHeaders } from "@/lib/staff-session";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

async function forward(request: Request, path: string, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(`${base}/api/demo/staff/orders${path}`, {
      ...init,
      cache: "no-store",
      headers: await staffBackendHeaders(request),
      signal: AbortSignal.timeout(init?.method === "GET" || !init?.method ? 5000 : 15000),
    });
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ message: "The order service is unavailable. Try again." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const denied = await staffRequestError(request, "orders.read"); if (denied) return denied;
  const query = new URL(request.url).searchParams;
  return forward(request, query.has("reference") ? `/${encodeURIComponent(query.get("reference")!)}` : query.get("view") === "orders" ? "" : "/options");
}

/** `?reference=…&production=send` sends a custom or alteration order to NY Production; `production=alteration` turns a
 * Ready-to-Wear order into an alteration. The API checks who may. */
export async function POST(request: Request) {
  const denied = await staffRequestError(request, "orders.read"); if (denied) return denied;
  const query = new URL(request.url).searchParams;
  if (query.get("production") === "send") {
    const reference = query.get("reference") ?? "";
    if (!/^[A-Z0-9-]{3,40}$/.test(reference)) return Response.json({ message: "Choose an order." }, { status: 422 });
    return forward(request, `/${reference}/send-to-production`, { method: "POST", body: "{}" });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ message: "Expected JSON." }, { status: 415 });
  }
  if (query.get("production") === "alteration") {
    const reference = query.get("reference") ?? "";
    if (!/^[A-Z0-9-]{3,40}$/.test(reference)) return Response.json({ message: "Choose an order." }, { status: 422 });
    const body = await request.json().catch(() => null);
    return forward(request, `/${reference}/needs-alteration`, { method: "POST", body: JSON.stringify({ specifications: body?.specifications }) });
  }
  return forward(request, "", { method: "POST", body: await request.text() });
}

/** Stage updates need orders.manage; `production: "brief"` (specifications and fitting before production) is checked by the API. */
export async function PATCH(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ message: "Expected JSON." }, { status: 415 });
  const body = await request.json().catch(() => null);
  const brief = body?.production === "brief";
  const denied = await staffRequestError(request, brief ? "orders.read" : "orders.manage"); if (denied) return denied;
  if (!body || typeof body.reference !== "string") return Response.json({ message: "Choose an order to update." }, { status: 422 });
  const { reference, production: _production, ...data } = body; void _production;
  if (brief) return forward(request, `/${encodeURIComponent(reference)}/brief`, { method: "PATCH", body: JSON.stringify({ specifications: data.specifications, measurement_id: data.measurement_id }) });
  return forward(request, `/${encodeURIComponent(reference)}/workflow`, { method: "PATCH", body: JSON.stringify(data) });
}
