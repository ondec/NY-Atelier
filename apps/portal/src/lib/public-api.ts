// Public pass-through for the customer website and RTW store (Render static sites rewrite
// /api/shop/catalogue and /api/consultations here). Laravel is internal on Render, so only
// these named, read-only or anonymous endpoints are exposed; staff routes stay behind sign-in.
const base = () => process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

/** The visitor's address, so Laravel's per-visitor rate limits do not lump everyone together. */
export function clientIp(request: Request): string | null {
  const direct = request.headers.get("true-client-ip") ?? request.headers.get("cf-connecting-ip");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const ip = (direct ?? forwarded ?? "").trim();
  return /^[\da-f.:]{3,45}$/i.test(ip) ? ip : null;
}

export async function forwardPublic(request: Request, path: string, init: { method?: string; body?: string } = {}): Promise<Response> {
  const ip = clientIp(request);
  try {
    const response = await fetch(`${base()}${path}`, {
      method: init.method ?? "GET", body: init.body, cache: "no-store", signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(ip ? { "X-Forwarded-For": ip } : {}) },
    });
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "The atelier is unavailable right now. Try again shortly." }, { status: 503 });
  }
}
