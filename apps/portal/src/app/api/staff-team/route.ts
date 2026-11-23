import { teamBackend } from "./backend";

export async function GET(request: Request) { return teamBackend(request, ""); }
