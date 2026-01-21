import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_VERSION: process.env.NEXT_PUBLIC_VERSION || 'dev',
  },
};

export default nextConfig;
