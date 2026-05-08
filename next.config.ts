import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // swisseph is a native Node.js addon — must not be bundled by webpack
  serverExternalPackages: ['swisseph'],
};

export default nextConfig;
