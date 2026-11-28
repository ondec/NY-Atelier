import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clientIp } from "@/lib/public-api";
import { accountRoute, customerCookie, startBody } from "@/lib/customer-session";

export const runtime = "nodejs";
const base = () => process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const route = accountRoute((await params).path, request.method);
  if (!route) return Response.json({ message: "Not found." }, { status: 404 });
  const jar = await cookies();
  const token = jar.get(customerCookie.name)?.value;
  if (route.signedIn && !token) return Response.json({ message: "Please sign in." }, { status: 401 });

  let body: string | undefined;
  if (request.method !== "GET") {
    // JSON only: a plain cross-site form cannot send it, so the cookie can't be used from another site.
    if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ message: "Expected JSON." }, { status: 415 });
    const text = await request.text();
    if (text.length > 16 * 1024) return Response.json({ message: "The request is too large." }, { status: 413 });
    const parsed = text ? JSON.parse(text) as Record<string, unknown> : {};
    body = JSON.stringify(route.path.endsWith("/auth/start") ? startBody(parsed) : parsed);
  }

  const ip = clientIp(request);
  let response: Response;
  try {
    response = await fetch(`${base()}${route.path}`, {
      method: route.method, body, cache: "no-store", signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(ip ? { "X-Forwarded-For": ip } : {}),
        ...(route.signedIn && token ? { Authorization: `Bearer ${Buffer.from(token, "base64url").toString()}` } : {}),
      },
    });
  } catch {
    return Response.json({ message: "The atelier is unavailable right now. Try again shortly." }, { status: 503 });
  }
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (route.signsIn && response.ok && typeof data.token === "string") {
    const expires = typeof data.expiresAt === "string" ? new Date(data.expiresAt) : undefined;
    const reply = NextResponse.json({ customer: data.customer }, { status: 200, headers: { "Cache-Control": "no-store" } });
    reply.cookies.set(customerCookie.name, Buffer.from(data.token).toString("base64url"), { ...customerCookie.options, ...(expires ? { expires } : {}) });
    return reply;
  }
  const reply = NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  // Signed out, or the session ended: drop the cookie.
  if (route.signsOut || response.status === 401) reply.cookies.set(customerCookie.name, "", { ...customerCookie.options, maxAge: 0 });
  return reply;
}

export { handle as GET, handle as POST, handle as PATCH };
