import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ali-oss"],
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
