export const customerPageSize = 50;

/** Builds the list query sent to the API, keeping only the search, page and page-size parameters. */
export function customerListQuery(source: URLSearchParams): string {
  const params = new URLSearchParams();
  const search = (source.get("q") ?? "").trim().slice(0, 100);
  const page = Number(source.get("page"));
  const perPage = Number(source.get("per_page"));
  if (search) params.set("q", search);
  if (Number.isInteger(page) && page > 1 && page <= 10000) params.set("page", String(page));
  if (Number.isInteger(perPage) && perPage >= 1 && perPage <= 100) params.set("per_page", String(perPage));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** The browser-side query string for one page of customer search results. */
export function customerSearchQuery(search: string, page = 1, perPage = customerPageSize): string {
  return customerListQuery(new URLSearchParams({ q: search, page: String(page), per_page: String(perPage) }));
}
