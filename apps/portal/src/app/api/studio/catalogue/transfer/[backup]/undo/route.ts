import { catalogueTransferDenied } from "@/lib/catalogue-transfer-access";
import { CatalogueError, studioBackend } from "@/lib/studio-catalogue-store";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ backup: string }> }) {
  const denied = await catalogueTransferDenied(request); if (denied) return denied;
  const { backup } = await params;
  if (!/^[1-9][0-9]{0,18}$/.test(backup)) return Response.json({ message: "This import cannot be found." }, { status: 404 });
  try { return Response.json(await studioBackend(`catalogue/transfer/${backup}/undo`, {}), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return Response.json({ message: error instanceof CatalogueError ? error.message : "Could not undo the import. Try again." }, { status: error instanceof CatalogueError ? error.status : 503 }); }
}
