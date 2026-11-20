import path from "node:path";
import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['127.0.0.1', ...Object.values(networkInterfaces()).flatMap(addresses =>
    (addresses ?? []).filter(address => address.family === 'IPv4' && !address.internal).map(address => address.address))],
  distDir: process.env.NY_STAFF_PREVIEW === "1" ? ".next-staff-preview" : process.env.NY_WORKSPACE_LAYOUT === "top" ? ".next-top-preview" : ".next",
  turbopack: { root: path.join(__dirname, "..") },
};

export default nextConfig;
