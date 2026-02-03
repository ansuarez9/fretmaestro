import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['vexflow', 'tone'],
  turbopack: {},
};

export default nextConfig;
