import {staffBackendHeaders, staffRequestError} from '@/lib/staff-session';

export const runtime = 'nodejs';

export async function GET(request: Request, {params}: {params: Promise<{path: string[]}>}) {
  const denied = await staffRequestError(request, 'customers');
  if (denied) return denied;
  const {path} = await params;
  if (path.length !== 3 || !/^\d+$/.test(path[0]) || !/^\d+$/.test(path[1]) || !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(path[2])) {
    return Response.json({message: 'Attachment not found.'}, {status: 404});
  }
  try {
    const headers = await staffBackendHeaders(request);
    const range = request.headers.get('range');
    if (range) headers.Range = range;
    const result = await fetch(`${process.env.API_BASE_URL ?? 'http://127.0.0.1:8000'}/api/demo/staff/customers/${path[0]}/measurements/${path[1]}/attachments/${path[2]}`, {
      headers, cache: 'no-store', signal: AbortSignal.timeout(30000),
    });
    if (!result.ok && result.status !== 416) return Response.json({message: 'Attachment unavailable.'}, {status: result.status});
    const outgoing = new Headers({'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Cookie'});
    for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'content-disposition']) {
      const value = result.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    return new Response(result.body, {status: result.status, headers: outgoing});
  } catch {
    return Response.json({message: 'Attachment unavailable. Try again.'}, {status: 503});
  }
}
