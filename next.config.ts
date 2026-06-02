import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    'mardi-von-framed-outdoors.trycloudflare.com',
    '*.trycloudflare.com',
    'localhost:3000'
  ],
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  } as any
};

export default nextConfig;
