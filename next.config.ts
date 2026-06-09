import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow @remotion/bundler (which uses webpack internally) to run in API routes
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "remotion",
  ],
};

export default nextConfig;
