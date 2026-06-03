import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    'mardi-von-framed-outdoors.trycloudflare.com',
    '*.trycloudflare.com',
    'localhost:3000'
  ],
  devIndicators: false
};

export default nextConfig;
