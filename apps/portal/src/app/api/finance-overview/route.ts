import { readStaff, staffBackendHeaders } from "@/lib/staff-session";
import { can } from "@/lib/staff-permissions";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store", Vary: "Cookie" };
  const staff = await readStaff(request);
  if (!staff) return Response.json({ message: "Sign in with your staff account." }, { status: 401, headers });
  if (!can(staff, "finances")) return Response.json({ message: "You don’t have permission to view finances." }, { status: 403, headers });
  const period = new URL(request.url).searchParams.get("period") ?? "year";
  if (!["month", "30days", "year"].includes(period)) return Response.json({ message: "Choose a reporting period." }, { status: 422, headers });
  try {
    const response = await fetch(`${process.env.API_BASE_URL ?? "http://127.0.0.1:8000"}/api/demo/staff/finances/overview?period=${period}`, {
      cache: "no-store", headers: await staffBackendHeaders(request), signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return Response.json({ message: "Financial records are unavailable. Please try again." }, { status: response.status, headers });
    return Response.json(await response.json(), { headers });
  } catch {
    return Response.json({ message: "Financial records are unavailable. Please try again." }, { status: 503, headers });
  }
}
