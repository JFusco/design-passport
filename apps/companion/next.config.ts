import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    proxyClientMaxBodySize: 27_000_000,
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
