import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
    // Proxy buffers the request body. Keep this aligned with photo uploads.
    proxyClientMaxBodySize: "16mb",
  },
};

export default nextConfig;
