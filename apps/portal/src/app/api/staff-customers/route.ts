import { staffRequestError, staffBackendHeaders } from "@/lib/staff-session";
import {fittingRequestBody} from '@/lib/fitting-request';
import { customerListQuery } from '@/lib/customer-search';

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

async function forward(request: Request, method: "GET" | "POST" | "PATCH") {
  const denied = await staffRequestError(request, "customers"); if (denied) return denied;
  const query = new URL(request.url).searchParams;
  const id = query.get("id");
  const measure = query.get("mode") === "measurements";
  if ((id !== null && !/^\d+$/.test(id)) || ((method === "PATCH" || measure) && !id)) {
    return Response.json({ message: "Choose a customer." }, { status: 422 });
  }
  const multipart = method === 'POST' && measure && request.headers.get('content-type')?.startsWith('multipart/form-data;');
  if (method !== "GET" && !multipart && !request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ message: "Expected JSON." }, { status: 415 });
  }
  try {
    const response = await fetch(`${base}/api/demo/staff/customers${id ? `/${id}` : ""}${measure ? "/measurements" : ""}${method === "GET" && !id ? customerListQuery(query) : ""}`, {
      method,
      cache: "no-store",
      headers: {...await staffBackendHeaders(request), ...(multipart ? {'Content-Type': request.headers.get('content-type')!} : {})},
      body: method === "GET" ? undefined : await fittingRequestBody(request),
      signal: AbortSignal.timeout(multipart ? 120000 : 8000),
    });
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Customer records are unavailable. Try again." }, { status: 503 });
  }
}

export const GET = (request: Request) => forward(request, "GET");
export const POST = (request: Request) => forward(request, "POST");
export const PATCH = (request: Request) => forward(request, "PATCH");
