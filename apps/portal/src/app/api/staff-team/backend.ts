import { staffBackendHeaders, staffRequestError } from "@/lib/staff-session";
import { studioJson } from "@/lib/studio-access";

/** Owner-only Team proxy. Invitation responses can contain a one-use setup link, so they are never cached. */
export async function teamBackend(request: Request, path: string, method: "GET" | "POST" = "GET") {
  const denied = await staffRequestError(request, "team"); if (denied) return denied;
  try {
    const body = method === "POST" && path === "/invitations" ? JSON.stringify(await studioJson(request, 4096)) : undefined;
    const response = await fetch(`${process.env.API_BASE_URL ?? "http://127.0.0.1:8000"}/api/demo/staff/team${path}`, {
      method, body, cache: "no-store", headers: await staffBackendHeaders(request), signal: AbortSignal.timeout(20000),
    });
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ message: "The team directory is unavailable. Please try again." }, { status: 503 }); }
}
