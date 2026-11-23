import { teamBackend } from "../../backend";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ member: string }> }) {
  const { member } = await params;
  if (!/^\d{1,9}$/.test(member)) return Response.json({ message: "Choose a team member." }, { status: 404 });
  return teamBackend(request, `/${member}/invitation`, "POST");
}
