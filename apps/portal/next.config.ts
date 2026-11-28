import path from "node:path";
import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NY_STANDALONE === "1" ? {
    output: "standalone",
    outputFileTracingRoot: path.join(__dirname, "../.."),
  } : {}),
  devIndicators: false,
  allowedDevOrigins: ['127.0.0.1', ...Object.values(networkInterfaces()).flatMap(addresses =>
    (addresses ?? []).filter(address => address.family === 'IPv4' && !address.internal).map(address => address.address))],
  // NY_NEXT_DIST_DIR keeps separate builds (for example the staff-test instance) from overwriting the dev server's .next.
  distDir: process.env.NY_NEXT_DIST_DIR ? process.env.NY_NEXT_DIST_DIR : process.env.NY_STAFF_PREVIEW === "1" ? ".next-staff-preview" : process.env.NY_WORKSPACE_LAYOUT === "top" ? ".next-top-preview" : ".next",
  // CDN-friendly caching for the public website and RTW Store (served from public/_sites through proxy.ts).
  // Vite's files under assets/ have a content hash in their name, so a CDN and browsers can keep them for a year.
  // Photos, videos and fonts keep a day and refresh in the background. Pages (index.html) stay uncached so a
  // deploy shows at once.
  async headers() {
    const year = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    const day = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    const prefixes = ["", "/home", "/shop", "/home/shop"];
    return prefixes.flatMap((prefix) => [
      { source: `${prefix}/assets/:file*`, headers: year },
      ...["images", "videos", "products", "fonts"].map((folder) => ({ source: `${prefix}/${folder}/:file*`, headers: day })),
    ]);
  },
  turbopack: { root: path.join(__dirname, process.env.NY_STANDALONE === "1" ? "../.." : "..") },
};

export default nextConfig;
