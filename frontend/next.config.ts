import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  outputFileTracingRoot: path.resolve(process.cwd()),
  async redirects() {
    return [
      {
        source: '/me/settings',
        destination: '/me?section=security',
        permanent: true,
      },
    ];
  },
};

// eslint-disable-next-line import/no-default-export -- Next.js convention: next.config.ts must default-export the config object
export default nextConfig;
