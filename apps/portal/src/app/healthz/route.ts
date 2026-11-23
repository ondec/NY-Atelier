export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(`${process.env.API_BASE_URL ?? "http://127.0.0.1:8000"}/up`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) return new Response("ok", { headers: { "Cache-Control": "no-store" } });
  } catch { /* Keep health responses free of connection details. */ }
  return new Response("unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
}
