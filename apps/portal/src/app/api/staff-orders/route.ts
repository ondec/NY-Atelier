import { staffRequestError, staffBackendHeaders } from "@/lib/staff-session";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

async function forward(request: Request, path: string, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(`${base}/api/demo/staff/orders${path}`, {
      ...init,
      cache: "no-store",
      headers: await staffBackendHeaders(request),
      signal: AbortSignal.timeout(init?.method === "PATCH" ? 15000 : 5000),
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

export async function POST(request: Request) {
  const denied = await staffRequestError(request, "orders.read"); if (denied) return denied;
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ message: "Expected JSON." }, { status: 415 });
  }
  return forward(request, "", { method: "POST", body: await request.text() });
}

export async function PATCH(request: Request) {
  const denied = await staffRequestError(request, "orders.manage"); if (denied) return denied;
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ message: "Expected JSON." }, { status: 415 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.reference !== "string") return Response.json({ message: "Choose an order to update." }, { status: 422 });
  const { reference, ...data } = body;
  return forward(request, `/${encodeURIComponent(reference)}/workflow`, { method: "PATCH", body: JSON.stringify(data) });
}
