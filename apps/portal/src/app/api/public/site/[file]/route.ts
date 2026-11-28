import { forwardPublic } from "@/lib/public-api";
import { sitesUseOwnAddresses } from "@/lib/public-sites";

export const runtime = "nodejs";

// robots.txt and sitemap.xml for the public website (served at /robots.txt and /sitemap.xml on its address,
// see siteRoute). While NY_PUBLIC_SITES_NOINDEX=1, or on the /home preview, search engines are kept out.
const PAGES = ["/", "/services", "/our-story", "/appointment", "/contact", "/shop", "/shop/new", "/shop/men", "/shop/women", "/shop/accessories", "/shop/collections", "/shop/all"];
const PRIVATE = ["/api/", "/account", "/appointment/reply", "/shop/saved", "/staff"];

let cached: { at: number; xml: string } | null = null;
const maxAgeMs = 10 * 60_000;

const hidden = () => process.env.NY_PUBLIC_SITES_NOINDEX === "1" || !sitesUseOwnAddresses();
const origin = () => (process.env.NY_WEBSITE_ORIGIN ?? "").replace(/\/$/, "");
const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (file === "robots") {
    const body = hidden()
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *\nAllow: /\n${PRIVATE.map(path => `Disallow: ${path}`).join("\n")}\n\nSitemap: ${origin()}/sitemap.xml\n`;
    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
  }
  if (file !== "sitemap" || hidden()) return new Response("Not found.", { status: 404 });

  if (!cached || Date.now() - cached.at > maxAgeMs) {
    const paths = [...PAGES];
    try {
      const response = await forwardPublic(request, "/api/shop/catalogue");
      if (response.ok) {
        const data = await response.json() as { products?: { id: string }[]; collections?: { id: string }[] };
        for (const product of data.products ?? []) paths.push(`/shop/product/${encodeURIComponent(product.id)}`);
        for (const collection of data.collections ?? []) paths.push(`/shop/collections/${encodeURIComponent(collection.id)}`);
      }
    } catch { /* pages only when the catalogue is unavailable */ }
    const base = origin();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(path => `  <url><loc>${escape(`${base}${path === "/" ? "/" : path}`)}</loc></url>`).join("\n")}\n</urlset>\n`;
    cached = { at: Date.now(), xml };
  }
  return new Response(cached.xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
