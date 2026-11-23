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
  turbopack: { root: path.join(__dirname, process.env.NY_STANDALONE === "1" ? "../.." : "..") },
};

export default nextConfig;
