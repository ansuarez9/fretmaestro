import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals = {
        ...config.externals,
        fs: 'empty',
        path: 'empty',
      }
    }
    return config
  },
  transpilePackages: ['vexflow', 'tone'],
};

export default nextConfig;
