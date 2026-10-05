import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.DESIGN_PASSPORT_DEV_OUTPUT ?? ".next",
  experimental: {
    proxyClientMaxBodySize: 27_000_000,
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
