import {readStaff, staffBackendHeaders} from '@/lib/staff-session';

export async function GET(request: Request) {
  const staff = await readStaff(request);
  const headers = {'Cache-Control': 'no-store', Vary: 'Cookie'};
  if (!staff) return Response.json({message: 'Sign in with your staff account.'}, {status: 401, headers});
  if (!['owner', 'manager', 'operations'].includes(staff.role)) return Response.json({message: 'This overview is for the Owner and managers.'}, {status: 403, headers});
  // Sales and payroll: Owner and general manager only.
  const finances = ['owner', 'manager'].includes(staff.role);
  const period = new URL(request.url).searchParams.get('period') ?? 'month';
  if (!['month', '30days', 'year'].includes(period)) return Response.json({message: 'Choose a reporting period.'}, {status: 422, headers});
  const base = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000';
  const auth = await staffBackendHeaders(request);
  const paths = ['orders', 'consultations', 'deliveries', 'production', ...(finances ? [`overview?period=${period}`] : [])];
  const results = await Promise.allSettled(paths.map(async path => {
    const response = await fetch(`${base}/api/demo/staff/${path}`, {cache: 'no-store', headers: auth, signal: AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error('Unavailable');
    return response.json();
  }));
  const data = results.map(result => result.status === 'fulfilled' ? result.value : null);
  return Response.json({orders: data[0]?.orders ?? null, consultations: data[1], deliveries: data[2]?.deliveries ?? null, production: data[3]?.orders ?? null, finances: finances ? data[4] : null, updatedAt: new Date().toISOString()}, {headers});
}
