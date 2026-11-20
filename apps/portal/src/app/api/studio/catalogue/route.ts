import { canManageCatalogue, studioAuthorized, studioCors, studioJson, studioSameOrigin } from "@/lib/studio-access";
import { CatalogueError, readStudioCatalogue, writeStudioCatalogue } from "@/lib/studio-catalogue-store";
export const runtime = "nodejs";
export async function OPTIONS(request: Request) { return new Response(null, { status: 204, headers: studioCors(request) }); }
export async function GET(request: Request) {
  if (!await studioAuthorized(request)) return Response.json({ message: "Sign in with your staff account." }, { status: 401, headers: studioCors(request) });
  try { return Response.json(await readStudioCatalogue(), { headers: { ...studioCors(request), "Cache-Control": "no-store" } }); }
  catch (error) { return Response.json({ message: error instanceof CatalogueError ? error.message : "The shared catalogue is unavailable. Try again." }, { status: error instanceof CatalogueError ? error.status : 503, headers: studioCors(request) }); }
}
export async function POST(request: Request) {
  if (!await canManageCatalogue(request) || !studioSameOrigin(request)) return Response.json({ message: "Manage the catalogue in NY Office." }, { status: 403 });
  try {
    const data = await studioJson(request, 32 * 1024 * 1024);
    if (!Array.isArray(data.inventory?.products) || !Array.isArray(data.inventory?.variants) || !Array.isArray(data.collections) || !Number.isInteger(data.revision)) return Response.json({ message: "Reload the shared catalogue before saving." }, { status: 422 });
    return Response.json(await writeStudioCatalogue(data));
  } catch (error) { return Response.json({ message: error instanceof CatalogueError ? error.message : "Could not share the catalogue. Review the uploaded images." }, { status: error instanceof CatalogueError ? error.status : 503 }); }
}
