import { staffRequestError, staffBackendHeaders } from "@/lib/staff-session";
const base = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

async function forward(request: Request, path = "", init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(`${base}/api/demo/${path ? "consultations" : "staff/consultations"}${path}`, {
      ...init,
      cache: "no-store",
      headers: await staffBackendHeaders(request),
      signal: AbortSignal.timeout(20000),
    });
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ message: "Appointments are unavailable. Try again." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const denied = await staffRequestError(request, "consultations"); if (denied) return denied;
  return forward(request);
}

export async function PATCH(request: Request) {
  const denied = await staffRequestError(request, "consultations"); if (denied) return denied;
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ message: "Expected JSON." }, { status: 415 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(body.id)) {
    return Response.json({ message: "Choose a valid appointment." }, { status: 422 });
  }
  return forward(request, `/${body.id}/staff`, { method: "PATCH", body: JSON.stringify(body) });
}
