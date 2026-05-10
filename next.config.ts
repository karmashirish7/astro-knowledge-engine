import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['swisseph'],
  // Tell Vercel's file tracer to always bundle the swisseph native .node binary
  outputFileTracingIncludes: {
    '/api/**': ['./node_modules/swisseph/**'],
  },
};

export default nextConfig;
