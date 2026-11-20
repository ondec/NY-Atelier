import { CatalogueError, readStudioCatalogue, studioBackend } from "@/lib/studio-catalogue-store";
import { studioAuthorized, studioCors, studioJson, studioSameOrigin } from "@/lib/studio-access";
export const runtime = "nodejs";
type Context = { params: Promise<{path?: string[]}> };
export async function OPTIONS(request: Request) { return new Response(null, {status:204, headers:studioCors(request)}); }
async function forward(request: Request, context: Context) {
  const headers = { ...studioCors(request), "Cache-Control": "no-store" };
  if (!await studioAuthorized(request)) return Response.json({message:"Sign in with your staff account."},{status:401,headers});
  if (request.method === "POST" && !studioSameOrigin(request)) return Response.json({message:"Open NY Studio to record a sale."},{status:403,headers});
  const route = (await context.params).path?.join("/") ?? "";
  if (request.method === "GET" ? route && !/^[a-f0-9-]{36}$/i.test(route) : route && route !== "quote") return Response.json({message:"Choose a Studio sale."},{status:404,headers});
  try {
    await readStudioCatalogue();
    const query = new URL(request.url).searchParams;
    const suffix = request.method === "GET" && !route ? `?${new URLSearchParams({page:query.get("page") ?? "1",search:query.get("search") ?? ""})}` : "";
    const data = await studioBackend(`sales${route ? `/${route}` : ""}${suffix}`,request.method === "GET" ? undefined : await studioJson(request));
    return Response.json(data,{headers});
  } catch(error) { return Response.json({message:error instanceof CatalogueError ? error.message : "The sale could not be confirmed. Retry this checkout before starting another."},{status:error instanceof CatalogueError ? error.status : 503,headers}); }
}
export const GET = forward;
export const POST = forward;
