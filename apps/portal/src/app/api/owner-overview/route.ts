import {readStaff, staffBackendHeaders} from '@/lib/staff-session';

export async function GET(request: Request) {
  const staff = await readStaff(request);
  const headers = {'Cache-Control': 'no-store', Vary: 'Cookie'};
  if (!staff) return Response.json({message: 'Sign in with your staff account.'}, {status: 401, headers});
  if (staff.role !== 'owner') return Response.json({message: 'This overview is available to the Owner.'}, {status: 403, headers});
  const period = new URL(request.url).searchParams.get('period') ?? 'month';
  if (!['month', '30days', 'year'].includes(period)) return Response.json({message: 'Choose a reporting period.'}, {status: 422, headers});
  const base = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000';
  const auth = await staffBackendHeaders(request);
  const paths = ['orders', 'consultations', `overview?period=${period}`];
  const results = await Promise.allSettled(paths.map(async path => {
    const response = await fetch(`${base}/api/demo/staff/${path}`, {cache: 'no-store', headers: auth, signal: AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error('Unavailable');
    return response.json();
  }));
  const data = results.map(result => result.status === 'fulfilled' ? result.value : null);
  return Response.json({orders: data[0]?.orders ?? null, consultations: data[1], finances: data[2], updatedAt: new Date().toISOString()}, {headers});
}
