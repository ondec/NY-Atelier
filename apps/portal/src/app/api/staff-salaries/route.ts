import { staffRequestError, staffBackendHeaders } from "@/lib/staff-session";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
async function forward(request: Request, method: "GET" | "POST" | "PATCH") {
  const denied = await staffRequestError(request, "finances"); if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id");
  if ((id && !/^[a-f0-9-]{36}$/i.test(id)) || (method === "PATCH" && !id)) return Response.json({ message: "Choose a salary batch." }, { status: 422 });
  if (method !== "GET") {
    const origin = request.headers.get("origin");
    if ((origin && new URL(origin).host !== request.headers.get("host")) || !request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ message: "Open the salary form in this portal." }, { status: 403 });
  }
  try {
    const result = await fetch(`${base}/api/demo/staff/salaries${id ? `/${id}` : ""}`, {
      method, cache: "no-store", headers: await staffBackendHeaders(request),
      body: method === "GET" ? undefined : await request.text(), signal: AbortSignal.timeout(10000),
    });
    return Response.json(await result.json(), { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ message: "Salary records are unavailable. Please try again." }, { status: 503 }); }
}
export const GET = (request: Request) => forward(request, "GET");
export const POST = (request: Request) => forward(request, "POST");
export const PATCH = (request: Request) => forward(request, "PATCH");
