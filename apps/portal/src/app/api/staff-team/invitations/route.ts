import { teamBackend } from "../backend";
export const runtime = "nodejs";

export async function POST(request: Request) { return teamBackend(request, "/invitations", "POST"); }
