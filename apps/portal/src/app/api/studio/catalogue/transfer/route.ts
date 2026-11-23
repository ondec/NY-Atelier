import { catalogueTransferDenied } from "@/lib/catalogue-transfer-access";
import { CatalogueError, studioBackend } from "@/lib/studio-catalogue-store";
import { studioJson } from "@/lib/studio-access";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = await catalogueTransferDenied(request); if (denied) return denied;
  try {
    const data = await studioJson(request, 8 * 1024 * 1024);
    return Response.json(await studioBackend("catalogue/transfer", { transfer: data.transfer, apply: data.apply === true, revision: data.revision }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ message: error instanceof CatalogueError ? error.message : "Could not read this import file." }, { status: error instanceof CatalogueError ? error.status : 422 }); }
}
