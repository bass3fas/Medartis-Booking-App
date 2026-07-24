import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['*.ngrok-free.app', 'localhost:3000'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // 👈 Bumps limit from 1MB to 10MB
    },
  },
};

export default nextConfig;
