import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  images: {
    unoptimized: true,
  },
  experimental: {
    agentFeedback: true,
  },
  allowedDevOrigins: ['192.168.1.9', '192.168.1.2', 'http://192.168.1.2', 'http://192.168.1.9', 'http://localhost', 'localhost'],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
