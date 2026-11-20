export function inStudio() { return typeof window !== "undefined" && window.location.pathname.startsWith("/showroom"); }
export function customerEndpoint(query: string) {
  if (!inStudio()) return `/api/staff-customers${query}`;
  const params = new URLSearchParams(query); const id = params.get("id");
  return `/api/studio/records/customers${id ? `/${encodeURIComponent(id)}` : ""}${params.get("mode") === "measurements" ? "/measurements" : ""}`;
}
export function orderEndpoint(mode: "options" | "list" | "detail" | "update" | "create", reference = "") {
  if (!inStudio()) return mode === "detail" ? `/api/staff-orders?reference=${encodeURIComponent(reference)}` : mode === "list" ? "/api/staff-orders?view=orders" : "/api/staff-orders";
  return `/api/studio/records/orders${mode === "options" ? "/options" : mode === "detail" || mode === "update" ? `/${encodeURIComponent(reference)}${mode === "update" ? "/workflow" : ""}` : ""}`;
}
