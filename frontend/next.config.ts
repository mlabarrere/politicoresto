import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  outputFileTracingRoot: path.resolve(process.cwd())
};

export default nextConfig;
