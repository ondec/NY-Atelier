import { forwardPublic } from "@/lib/public-api";

export const runtime = "nodejs";

// A short shared copy keeps busy pages from hitting Laravel's rate limit; staff edits show within seconds.
let cached: { at: number; body: string; status: number } | null = null;
const maxAgeMs = 10_000;

export async function GET(request: Request) {
  if (!cached || Date.now() - cached.at > maxAgeMs) {
    const response = await forwardPublic(request, "/api/shop/catalogue");
    const body = await response.text();
    if (response.status !== 200) return new Response(body, { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    cached = { at: Date.now(), body, status: 200 };
  }
  return new Response(cached.body, { status: cached.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
