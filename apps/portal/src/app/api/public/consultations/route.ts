import { forwardPublic } from "@/lib/public-api";

export const runtime = "nodejs";

/** Consultation requests from the public website. Laravel validates and rate-limits per visitor. */
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ message: "Expected JSON." }, { status: 415 });
  const body = await request.text();
  if (body.length > 16 * 1024) return Response.json({ message: "The request is too large." }, { status: 413 });
  return forwardPublic(request, "/api/consultations", { method: "POST", body });
}
