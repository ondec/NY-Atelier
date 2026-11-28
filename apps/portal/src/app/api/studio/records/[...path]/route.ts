import { staffBackendHeaders } from "@/lib/staff-session";
import { studioAuthorized, studioCors, studioJson, studioSameOrigin } from "@/lib/studio-access";
import {fittingRequestBody} from '@/lib/fitting-request';
import { customerListQuery } from '@/lib/customer-search';
export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
/** NY Studio works with custom and alteration orders; Ready-to-Wear orders stay in NY Office. */
const studioOrderCategories: unknown[] = ["Custom", "Alterations"];
function orderListQuery(params: URLSearchParams) { const customer = params.get("customer"); return customer && /^\d+$/.test(customer) ? `?customer=${customer}` : ""; }
export async function OPTIONS(request: Request) { return new Response(null, { status: 204, headers: studioCors(request) }); }
async function forward(request: Request, context: Context) {
  const headers = studioCors(request);
  if (!await studioAuthorized(request)) return Response.json({ message: "Sign in with your staff account." }, { status: 401, headers });
  if (request.method !== "GET" && !studioSameOrigin(request)) return Response.json({ message: "Open NY Studio to save records." }, { status: 403, headers });
  const { path } = await context.params;
  const route = path.join("/");
  const method = request.method;
  const allowed = /^(customers(?:\/\d+(?:\/measurements)?)?|orders(?:\/options|\/[A-Z0-9-]+(?:\/workflow|\/brief|\/send-to-production)?)?|front-desk\/(?:alerts|seen))$/.test(route);
  if (!allowed || !["GET", "POST", "PATCH"].includes(method)) return Response.json({ message: "Unavailable in NY Studio." }, { status: 404, headers });
  try {
    const base = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
    const target = `${base}/api/demo/staff/${route === 'orders' && method === 'POST' ? 'studio/orders' : route}${route === 'customers' && method === 'GET' ? customerListQuery(new URL(request.url).searchParams) : ''}${route === 'orders' && method === 'GET' ? orderListQuery(new URL(request.url).searchParams) : ''}`;
    const multipart = method === 'POST' && /^customers\/\d+\/measurements$/.test(route) && request.headers.get('content-type')?.startsWith('multipart/form-data;');
    const upload = multipart ? await fittingRequestBody(request) : undefined;
    let body;
    if (method !== "GET" && !multipart) {
      body = await studioJson(request);
      if (route === "orders" && (method !== "POST" || !studioOrderCategories.includes(body.category))) return Response.json({ message: "Only custom and alteration orders can be issued here." }, { status: 403, headers });
    }
    if (/^orders\/[A-Z0-9-]+(?:\/workflow|\/brief|\/send-to-production)?$/.test(route)) {
      const check = await fetch(`${base}/api/demo/staff/orders/${path[1]}`, { cache: "no-store", headers: await staffBackendHeaders(request) });
      const current = await check.json();
      if (!check.ok || !current.order) return Response.json({ message: "Choose an order." }, { status: 404, headers });
    }
    const response = await fetch(target, { method, cache: "no-store", headers: {...await staffBackendHeaders(request), ...(multipart ? {'Content-Type': request.headers.get('content-type')!} : {})}, body: upload ?? (body ? JSON.stringify(body) : undefined), signal: AbortSignal.timeout(multipart ? 120000 : 15000) });
    const payload = await response.json();
    return Response.json(payload, { status: response.status, headers });
  } catch { return Response.json({ message: "Studio records are unavailable. Check the connection and try again." }, { status: 503, headers }); }
}
export const GET = forward;
export const POST = forward;
export const PATCH = forward;
