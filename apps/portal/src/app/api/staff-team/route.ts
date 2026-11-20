import { staffRequestError, staffBackendHeaders } from "@/lib/staff-session";

export async function GET(request: Request) {
  const denied = await staffRequestError(request, "team"); if (denied) return denied;
  try {
    const response = await fetch(`${process.env.API_BASE_URL ?? "http://127.0.0.1:8000"}/api/demo/staff/team`, {
      cache: "no-store", headers: await staffBackendHeaders(request), signal: AbortSignal.timeout(8000),
    });
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ message: "The team directory is unavailable. Please try again." }, { status: 503 }); }
}
