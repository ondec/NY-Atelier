import { forwardPublic } from "@/lib/public-api";

export const runtime = "nodejs";
const uuid = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;

/** The website's appointment reply page (from the "choose a time" email). Laravel checks the link's token. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await params;
  if (!uuid.test(id) || (action !== "view" && action !== "reply")) return Response.json({ message: "Not found." }, { status: 404 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ message: "Expected JSON." }, { status: 415 });
  const body = await request.text();
  if (body.length > 4 * 1024) return Response.json({ message: "The request is too large." }, { status: 413 });
  return forwardPublic(request, `/api/consultations/${id}/${action}`, { method: "POST", body });
}
