import { customerListQuery } from "./customer-search";
export function inStudio() { return typeof window !== "undefined" && window.location.pathname.startsWith("/showroom"); }
export function customerEndpoint(query: string) {
  if (!inStudio()) return `/api/staff-customers${query}`;
  const params = new URLSearchParams(query); const id = params.get("id");
  return `/api/studio/records/customers${id ? `/${encodeURIComponent(id)}` : ""}${params.get("mode") === "measurements" ? "/measurements" : ""}${id ? "" : customerListQuery(params)}`;
}
/** For "list", `reference` may be a customer id to list only that customer's orders (NY Studio only). */
/** Where to save an order's production brief, or send it to NY Production (Office or Studio). */
export function productionHandoverEndpoint(action: "brief" | "send", reference: string) {
  if (!inStudio()) return action === "send" ? `/api/staff-orders?reference=${encodeURIComponent(reference)}&production=send` : "/api/staff-orders";
  return `/api/studio/records/orders/${encodeURIComponent(reference)}/${action === "send" ? "send-to-production" : "brief"}`;
}
export function orderEndpoint(mode: "options" | "list" | "detail" | "update" | "create", reference = "") {
  if (!inStudio()) return mode === "detail" ? `/api/staff-orders?reference=${encodeURIComponent(reference)}` : mode === "list" ? "/api/staff-orders?view=orders" : "/api/staff-orders";
  return `/api/studio/records/orders${mode === "options" ? "/options" : mode === "detail" || mode === "update" ? `/${encodeURIComponent(reference)}${mode === "update" ? "/workflow" : ""}` : mode === "list" && reference ? `?customer=${encodeURIComponent(reference)}` : ""}`;
}
