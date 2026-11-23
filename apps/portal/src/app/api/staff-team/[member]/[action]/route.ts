import { teamBackend } from "../../backend";
export const runtime = "nodejs";
type Context = { params: Promise<{ member: string; action: string }> };

const postActions = ["invitation", "deactivate", "reactivate"];

async function target(context: Context) {
  const { member, action } = await context.params;
  return /^\d{1,9}$/.test(member) ? { member, action } : undefined;
}

export async function POST(request: Request, context: Context) {
  const found = await target(context);
  if (!found || !postActions.includes(found.action)) return Response.json({ message: "Choose a team member." }, { status: 404 });
  return teamBackend(request, `/${found.member}/${found.action}`, "POST");
}

export async function PATCH(request: Request, context: Context) {
  const found = await target(context);
  if (!found || found.action !== "role") return Response.json({ message: "Choose a team member." }, { status: 404 });
  return teamBackend(request, `/${found.member}/role`, "PATCH", true);
}
