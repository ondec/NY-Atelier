import { staffRequestError } from '@/lib/staff-session';
import { studioJson } from '@/lib/studio-access';
import { readPublishedSizing, saveSizingAssignment, SizingConflict } from '@/lib/size-chart-store';
import { sizingProductId } from '../../../../../mobile/src/lib/sizing';

export const runtime = 'nodejs';
const publicHeaders = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
export async function OPTIONS() { return new Response(null, { status: 204, headers: publicHeaders }); }
export async function GET() {
  try {
    const data = await readPublishedSizing();
    const response = await fetch(`${process.env.API_BASE_URL ?? 'http://127.0.0.1:8000'}/api/demo/size-chart-collections`, {cache:'no-store',signal:AbortSignal.timeout(5000)}).catch(()=>null);
    const catalogue: {collections:{id:string;productIds:string[]}[]} = response?.ok ? await response.json() : {collections:[]};
    for (const [id, assignment] of Object.entries(data.collections)) {
      const collection = catalogue.collections.find(item => item.id === id.replace(/:(men|women)$/, ''));
      if (collection) assignment.productIds = collection.productIds.map(sizingProductId);
    }
    // Only sizing data is public. Staff records, costs and catalogue administration stay private.
    return Response.json(data, { headers: publicHeaders });
  } catch { return Response.json({ message: 'Size charts are temporarily unavailable.' }, { status: 503, headers: publicHeaders }); }
}
export async function POST(request: Request) {
  const denied = await staffRequestError(request, 'catalogue.manage'); if (denied) return denied;
  try { return Response.json(await saveSizingAssignment(await studioJson(request, 512 * 1024)), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : 'Could not save this chart.' }, { status: error instanceof SizingConflict ? 409 : 422 }); }
}
