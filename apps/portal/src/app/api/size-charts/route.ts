import { staffBackendHeaders, staffRequestError } from '@/lib/staff-session';
import { studioJson } from '@/lib/studio-access';
import { readPublishedSizing, saveSizingAssignment, SizingConflict } from '@/lib/size-chart-store';

export const runtime = 'nodejs';
const publicHeaders = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
export async function OPTIONS() { return new Response(null, { status: 204, headers: publicHeaders }); }
export async function GET() {
  try {
    // Collection defaults already list each collection's current garments (Laravel fills them in).
    const data = await readPublishedSizing();
    // Only sizing data is public. Staff records, costs and catalogue administration stay private.
    return Response.json(data, { headers: publicHeaders });
  } catch { return Response.json({ message: 'Size charts are temporarily unavailable.' }, { status: 503, headers: publicHeaders }); }
}
export async function POST(request: Request) {
  const denied = await staffRequestError(request, 'catalogue.manage'); if (denied) return denied;
  try { return Response.json(await saveSizingAssignment(await studioJson(request, 512 * 1024), await staffBackendHeaders(request)), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : 'Could not save this chart.' }, { status: error instanceof SizingConflict ? 409 : 422 }); }
}
